import {
  useState, useCallback, useEffect, useRef, KeyboardEvent as ReactKeyboardEvent
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bold, Heading1, Heading2, List, Code, Plus, Trash2, GripVertical,
  Cloud, Check, Search, Tag, X, Edit2, CheckSquare, Minus,
  ChevronRight, ChevronDown, NotebookPen, BookOpen, Share2,
  Loader2, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
type BlockType = "paragraph" | "h1" | "h2" | "bullet" | "code" | "checklist" | "divider";
type Block = { id: string; type: BlockType; content: string; checked?: boolean };
type StudentNote = {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  topic: string | null;
  tags: string[];
  blocks: Block[];
  is_shared: boolean;
  team_id: string | null;
  created_at: string;
  updated_at: string;
};

type QuizQuestion = { question: string; answer: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESET_TAGS = [
  "Linear Algebra", "Calculus", "Algorithms", "Discrete Math",
  "Probability", "OS", "Programming", "Exam Prep", "Lecture Notes", "Personal"
];

const SLASH_COMMANDS: { label: string; type: BlockType; icon: React.ReactNode; description: string }[] = [
  { label: "Heading 1", type: "h1", icon: <Heading1 className="h-4 w-4" />, description: "Big section heading" },
  { label: "Heading 2", type: "h2", icon: <Heading2 className="h-4 w-4" />, description: "Medium section heading" },
  { label: "Bullet List", type: "bullet", icon: <List className="h-4 w-4" />, description: "Simple bullet point" },
  { label: "Checklist", type: "checklist", icon: <CheckSquare className="h-4 w-4" />, description: "Track tasks" },
  { label: "Code Block", type: "code", icon: <Code className="h-4 w-4" />, description: "Code snippet" },
  { label: "Divider", type: "divider", icon: <Minus className="h-4 w-4" />, description: "Visual separator" },
  { label: "Paragraph", type: "paragraph", icon: <Bold className="h-4 w-4" />, description: "Plain text" },
];

const typeStyles: Record<BlockType, string> = {
  h1: "text-2xl font-bold",
  h2: "text-lg font-semibold",
  paragraph: "text-sm",
  bullet: "text-sm",
  code: "text-sm font-mono bg-muted/60 p-3 rounded-lg border border-border/40",
  checklist: "text-sm",
  divider: "",
};

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_MODEL = "llama-3.3-70b-versatile";

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ─── Slash Command Menu ───────────────────────────────────────────────────────
function SlashMenu({
  search, position, onSelect, onClose
}: {
  search: string;
  position: { top: number; left: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const filtered = SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => { setIdx(0); }, [search]);
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx(p => Math.min(p + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx(p => Math.max(p - 1, 0)); }
      if (e.key === "Enter" && filtered[idx]) { e.preventDefault(); onSelect(filtered[idx].type); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, idx, onSelect, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.12 }}
      style={{ position: "fixed", top: position.top, left: position.left, zIndex: 9999 }}
      className="glass-card border border-border/60 rounded-xl shadow-2xl w-64 py-1 overflow-hidden"
    >
      <p className="text-[10px] text-muted-foreground px-3 py-1">BLOCKS</p>
      {filtered.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No matching block type</p>}
      {filtered.map((cmd, i) => (
        <button key={cmd.type} onClick={() => onSelect(cmd.type)} onMouseEnter={() => setIdx(i)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${i === idx ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
          <div className={`p-1.5 rounded-md ${i === idx ? "bg-primary/20" : "bg-muted/50"}`}>{cmd.icon}</div>
          <div>
            <p className="text-xs font-medium">{cmd.label}</p>
            <p className="text-[10px] text-muted-foreground">{cmd.description}</p>
          </div>
        </button>
      ))}
    </motion.div>
  );
}

// ─── Link Menu ────────────────────────────────────────────────────────────────
function LinkMenu({
  notes, search, position, onSelect, onClose
}: {
  notes: StudentNote[];
  search: string;
  position: { top: number; left: number };
  onSelect: (title: string) => void;
  onClose: () => void;
}) {
  const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase())).slice(0, 6);
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      style={{ position: "fixed", top: position.top, left: position.left, zIndex: 9999 }}
      className="glass-card border border-border/60 rounded-xl shadow-2xl w-64 py-1 overflow-hidden">
      <p className="text-[10px] text-muted-foreground px-3 py-1">LINK TO NOTE</p>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground px-3 py-2">No notes found</p>
      ) : filtered.map(n => (
        <button key={n.id} onClick={() => onSelect(n.title)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors">
          <NotebookPen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs truncate">{n.title}</span>
        </button>
      ))}
    </motion.div>
  );
}

// ─── Render inline links ──────────────────────────────────────────────────────
function renderInlineLinks(text: string, onNavigate?: (title: string) => void): React.ReactNode {
  if (!text || !text.includes("[[")) return text;
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[\[(.*?)\]\]$/);
        if (match) {
          return (
            <span key={i}
              className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); onNavigate?.(match[1]); }}>
              {match[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Single Block Row ─────────────────────────────────────────────────────────
function NoteBlockRow({
  block, isEditing, allNotes, onFocus, onBlur, onChange, onAdd, onRemove, onChangeType, onCheck, onNavigateLink
}: {
  block: Block; isEditing: boolean; allNotes: StudentNote[];
  onFocus: () => void; onBlur: () => void; onChange: (c: string) => void;
  onAdd: () => void; onRemove: () => void; onChangeType: (t: BlockType) => void;
  onCheck?: (c: boolean) => void; onNavigateLink?: (title: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashSearch, setSlashSearch] = useState("");
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkPos, setLinkPos] = useState({ top: 0, left: 0 });
  const [linkTriggerIdx, setLinkTriggerIdx] = useState(-1);

  const getMenuPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    const rect = textareaRef.current.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") { e.preventDefault(); if (slashOpen) return; onAdd(); }
    if (e.key === "Backspace" && block.content === "" && block.type !== "h1") { e.preventDefault(); onRemove(); }
    if (e.key === "Escape") { setSlashOpen(false); setLinkOpen(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const slashIdx = val.lastIndexOf("/");
    if (slashIdx >= 0 && slashIdx === val.length - 1) { setSlashPos(getMenuPosition()); setSlashOpen(true); setSlashSearch(""); }
    else if (slashOpen) {
      const afterSlash = val.slice(val.lastIndexOf("/") + 1);
      if (val.includes("/") && !afterSlash.includes(" ")) setSlashSearch(afterSlash);
      else setSlashOpen(false);
    }
    const dblBracket = val.lastIndexOf("[[");
    if (dblBracket >= 0) {
      const afterBracket = val.slice(dblBracket + 2);
      if (!afterBracket.includes("]]")) { setLinkSearch(afterBracket); setLinkPos(getMenuPosition()); setLinkOpen(true); setLinkTriggerIdx(dblBracket); }
    } else setLinkOpen(false);
  };

  const applySlash = (type: BlockType) => {
    setSlashOpen(false); onChangeType(type);
    const slashIdx = block.content.lastIndexOf("/");
    if (slashIdx >= 0) onChange(block.content.slice(0, slashIdx));
  };
  const applyLink = (title: string) => {
    setLinkOpen(false);
    const before = block.content.slice(0, linkTriggerIdx);
    onChange(`${before}[[${title}]] `);
  };

  if (block.type === "divider") {
    return (
      <div className="group relative flex items-center gap-1 my-2"
        onMouseEnter={() => setShowToolbar(true)} onMouseLeave={() => setShowToolbar(false)}>
        <div className={`flex items-center gap-0.5 transition-opacity ${showToolbar ? "opacity-100" : "opacity-0"}`}>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd}><Plus className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
        </div>
        <hr className="flex-1 border-border/40" />
      </div>
    );
  }

  if (block.type === "checklist") {
    return (
      <div className="group relative flex items-start gap-2"
        onMouseEnter={() => setShowToolbar(true)} onMouseLeave={() => setShowToolbar(false)}>
        <div className={`flex items-center gap-0.5 pt-1 transition-opacity ${showToolbar ? "opacity-100" : "opacity-0"}`}>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd}><Plus className="h-3 w-3" /></Button>
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        <input type="checkbox" checked={!!block.checked} onChange={e => onCheck?.(e.target.checked)} className="mt-1 h-4 w-4 rounded accent-primary shrink-0" />
        {isEditing ? (
          <div className="flex-1 relative">
            <AnimatePresence>
              {slashOpen && <SlashMenu search={slashSearch} position={slashPos} onSelect={applySlash} onClose={() => setSlashOpen(false)} />}
              {linkOpen && <LinkMenu notes={allNotes} search={linkSearch} position={linkPos} onSelect={applyLink} onClose={() => setLinkOpen(false)} />}
            </AnimatePresence>
            <Textarea ref={textareaRef} autoFocus value={block.content} onChange={handleChange} onBlur={onBlur} onKeyDown={handleKeyDown}
              className={`border-0 bg-transparent resize-none p-0 focus-visible:ring-0 min-h-0 text-sm ${block.checked ? "line-through text-muted-foreground" : ""}`} rows={1} />
          </div>
        ) : (
          <div onClick={onFocus}
            className={`flex-1 cursor-text text-sm py-0.5 hover:bg-muted/40 rounded px-1 transition-colors ${block.checked ? "line-through text-muted-foreground" : ""} ${!block.content ? "italic text-muted-foreground" : ""}`}>
            {renderInlineLinks(block.content, onNavigateLink) || "To-do"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-1"
      onMouseEnter={() => setShowToolbar(true)} onMouseLeave={() => setShowToolbar(false)}>
      <div className={`flex items-center gap-0.5 pt-1 transition-opacity ${showToolbar ? "opacity-100" : "opacity-0"}`}>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd}><Plus className="h-3 w-3" /></Button>
        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
      </div>
      <div className="flex-1 min-w-0 relative">
        <AnimatePresence>
          {slashOpen && <SlashMenu search={slashSearch} position={slashPos} onSelect={applySlash} onClose={() => setSlashOpen(false)} />}
          {linkOpen && <LinkMenu notes={allNotes} search={linkSearch} position={linkPos} onSelect={applyLink} onClose={() => setLinkOpen(false)} />}
        </AnimatePresence>
        {isEditing ? (
          <div className="space-y-1">
            <div className="flex items-center gap-0.5 glass-subtle p-1 rounded-md w-fit">
              {([
                ["h1", <Heading1 className="h-3.5 w-3.5" />],
                ["h2", <Heading2 className="h-3.5 w-3.5" />],
                ["paragraph", <Bold className="h-3.5 w-3.5" />],
                ["bullet", <List className="h-3.5 w-3.5" />],
                ["checklist", <CheckSquare className="h-3.5 w-3.5" />],
                ["code", <Code className="h-3.5 w-3.5" />],
              ] as [BlockType, React.ReactNode][]).map(([t, icon]) => (
                <Button key={t} variant={block.type === t ? "default" : "ghost"} size="icon" className="h-6 w-6" onClick={() => onChangeType(t)}>{icon}</Button>
              ))}
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
            </div>
            <Textarea ref={textareaRef} autoFocus value={block.content} onChange={handleChange} onBlur={onBlur} onKeyDown={handleKeyDown}
              className={`border-0 bg-transparent resize-none p-0 focus-visible:ring-0 min-h-0 ${typeStyles[block.type]} ${block.type === "bullet" ? "pl-4" : ""}`}
              rows={block.type === "code" ? 4 : 1} />
          </div>
        ) : (
          <div onClick={onFocus}
            className={`cursor-text rounded px-1 py-0.5 hover:bg-muted/40 transition-colors ${typeStyles[block.type]} ${block.type === "bullet" ? "before:content-['•'] before:mr-2 before:text-primary flex" : ""} ${!block.content ? "text-muted-foreground italic" : ""}`}>
            {renderInlineLinks(block.content, onNavigateLink) || "Click to type..."}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Study Mode Panel ─────────────────────────────────────────────────────────
function StudyModePanel({ note, onClose }: { note: StudentNote; onClose: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"correct" | "needs_work">("correct");
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<("correct" | "needs_work")[]>([]);
  const [phase, setPhase] = useState<"generating" | "quiz" | "results">("generating");

  const noteText = note.blocks.map(b => b.content).filter(Boolean).join("\n");

  useEffect(() => {
    if (!API_KEY) { toast({ title: "Groq API key missing", variant: "destructive" }); return; }
    const generate = async () => {
      setLoading(true);
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: "system", content: 'You are a study assistant. Generate exactly 5 quiz questions based on the provided notes. Respond ONLY with a valid JSON array, no markdown, no extra text. Format: [{"question": "...", "answer": "..."}]' },
              { role: "user", content: "Generate 5 quiz questions from these notes:\n\n" + noteText.slice(0, 5000) }
            ],
            temperature: 0.3,
          }),
        });
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        let parsed: QuizQuestion[] = [];
        try { const p = JSON.parse(content); parsed = Array.isArray(p) ? p : p.questions || []; }
        catch { const m = content.match(/\[.*\]/s); if (m) parsed = JSON.parse(m[0]); }
        if (parsed.length === 0) throw new Error("No questions generated");
        setQuestions(parsed);
        setPhase("quiz");
      } catch (err) {
        toast({ title: "Failed to generate questions", description: String(err), variant: "destructive" });
        onClose();
      } finally { setLoading(false); }
    };
    generate();
  }, []);

  const checkAnswer = async () => {
    if (!userAnswer.trim()) return;
    setChecking(true);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: "You are grading a student answer. Be encouraging. Respond in 1-2 sentences." },
            { role: "user", content: `Question: ${questions[currentQ].question}\nCorrect answer: ${questions[currentQ].answer}\nStudent answer: ${userAnswer}\nIs this correct? Give brief feedback.` }
          ],
          temperature: 0.3,
        }),
      });
      const data = await res.json();
      const fb = data.choices?.[0]?.message?.content || "Could not grade answer.";
      const isCorrect = fb.toLowerCase().includes("correct") && !fb.toLowerCase().includes("not correct") && !fb.toLowerCase().includes("incorrect");
      setFeedback(fb);
      setFeedbackType(isCorrect ? "correct" : "needs_work");
      setResults(prev => [...prev, isCorrect ? "correct" : "needs_work"]);
    } catch { setFeedback("Error grading answer."); setFeedbackType("needs_work"); setResults(p => [...p, "needs_work"]); }
    finally { setChecking(false); }
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) { setPhase("results"); return; }
    setCurrentQ(p => p + 1); setUserAnswer(""); setFeedback(null);
  };

  const tryAgain = () => {
    setQuestions(q => [...q].sort(() => Math.random() - 0.5));
    setCurrentQ(0); setUserAnswer(""); setFeedback(null); setResults([]); setPhase("quiz");
  };

  const correctCount = results.filter(r => r === "correct").length;

  return (
    <motion.div initial={{ x: 384 }} animate={{ x: 0 }} exit={{ x: 384 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-96 border-l border-border/40 bg-background flex flex-col shrink-0 h-full">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <h3 className="font-bold text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Study Mode</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating questions...</p>
          </div>
        )}

        {phase === "quiz" && questions.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-medium">Question {currentQ + 1} of {questions.length}</p>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
            </div>
            <p className="text-base font-medium">{questions[currentQ].question}</p>
            <Textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} placeholder="Type your answer..."
              className="min-h-[80px]" disabled={!!feedback} />

            {!feedback ? (
              <Button className="w-full gap-2" onClick={checkAnswer} disabled={checking || !userAnswer.trim()}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Check Answer
              </Button>
            ) : (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl border text-sm ${feedbackType === "correct" ? "bg-success/10 border-success/30 text-success" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
                  {feedbackType === "correct" ? <CheckCircle className="h-4 w-4 inline mr-1.5" /> : <XCircle className="h-4 w-4 inline mr-1.5" />}
                  {feedback}
                </div>
                <p className="text-xs text-muted-foreground"><strong>Correct answer:</strong> {questions[currentQ].answer}</p>
                <Button className="w-full" onClick={nextQuestion}>
                  {currentQ + 1 >= questions.length ? "See Results" : "Next Question →"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "results" && (
          <div className="space-y-4 text-center">
            <p className="text-4xl font-black">{correctCount}/{questions.length}</p>
            <p className="text-sm text-muted-foreground">{correctCount >= 4 ? "Great job! 🎉" : correctCount >= 2 ? "Good effort! Keep studying 📚" : "Time to review! 💪"}</p>
            <div className="space-y-2 text-left">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-card/40 border border-border/20">
                  {results[i] === "correct" ? <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />}
                  <span className="truncate">{q.question}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={tryAgain}>Try Again</Button>
              <Button onClick={onClose} className="flex-1">Exit Study Mode</Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Notes Page ──────────────────────────────────────────────────────────
export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [search, setSearch] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const selectedNote = notes.find(n => n.id === selectedId) ?? null;

  // ── Load notes ──
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("student_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) { toast({ title: "Failed to load notes", description: error.message, variant: "destructive" }); }
      else if (data && data.length > 0) { setNotes(data as StudentNote[]); }
      setLoading(false);
    };
    load();

    // Real-time subscription
    channelRef.current = supabase
      .channel("student-notes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "student_notes", filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === "INSERT") setNotes(prev => [payload.new as StudentNote, ...prev.filter(n => n.id !== (payload.new as StudentNote).id)]);
        if (payload.eventType === "UPDATE") setNotes(prev => prev.map(n => n.id === (payload.new as StudentNote).id ? { ...n, ...payload.new as StudentNote } : n));
        if (payload.eventType === "DELETE") setNotes(prev => prev.filter(n => n.id !== (payload.old as { id: string }).id));
      })
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [user]);

  // Compute unique subjects for autocomplete
  useEffect(() => {
    const subjects = [...new Set(notes.map(n => n.subject).filter(Boolean) as string[])];
    setSubjectSuggestions(subjects);
  }, [notes]);

  // ── Save ──
  const saveNote = useCallback(async (note: StudentNote) => {
    if (!user) return;
    setSaveStatus("saving");
    const { error } = await supabase.from("student_notes").upsert({
      id: note.id, user_id: user.id, title: note.title, subject: note.subject, topic: note.topic,
      tags: note.tags, blocks: note.blocks, is_shared: note.is_shared, team_id: note.team_id,
      updated_at: new Date().toISOString(),
    });
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [user]);

  const scheduleSave = (note: StudentNote) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNote(note), 1500);
  };

  const updateSelected = (patch: Partial<StudentNote>) => {
    if (!selectedNote) return;
    const updated = { ...selectedNote, ...patch, updated_at: new Date().toISOString() };
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    scheduleSave(updated);
  };

  // ── Block operations ──
  const addBlock = (afterIdx: number) => {
    if (!selectedNote) return;
    const newBlock: Block = { id: uid(), type: "paragraph", content: "" };
    const blocks = [...selectedNote.blocks];
    blocks.splice(afterIdx + 1, 0, newBlock);
    updateSelected({ blocks });
    setEditingBlockId(newBlock.id);
  };
  const removeBlock = (idx: number) => {
    if (!selectedNote || selectedNote.blocks.length <= 1) return;
    const blocks = selectedNote.blocks.filter((_, i) => i !== idx);
    updateSelected({ blocks });
    setEditingBlockId(null);
  };
  const updateBlock = (idx: number, content: string) => {
    if (!selectedNote) return;
    const blocks = selectedNote.blocks.map((b, i) => i === idx ? { ...b, content } : b);
    updateSelected({ blocks });
  };
  const changeBlockType = (idx: number, type: BlockType) => {
    if (!selectedNote) return;
    const blocks = selectedNote.blocks.map((b, i) => i === idx ? { ...b, type } : b);
    updateSelected({ blocks });
  };
  const toggleCheck = (idx: number, checked: boolean) => {
    if (!selectedNote) return;
    const blocks = selectedNote.blocks.map((b, i) => i === idx ? { ...b, checked } : b);
    updateSelected({ blocks });
  };
  const toggleTag = (tag: string) => {
    if (!selectedNote) return;
    const tags = selectedNote.tags.includes(tag) ? selectedNote.tags.filter(t => t !== tag) : [...selectedNote.tags, tag];
    updateSelected({ tags });
  };

  // ── Note CRUD ──
  const createNote = async () => {
    if (!user) return;
    const newNote: StudentNote = {
      id: crypto.randomUUID(), user_id: user.id, title: "Untitled Note",
      subject: null, topic: null, tags: [],
      blocks: [{ id: uid(), type: "h1", content: "" }, { id: uid(), type: "paragraph", content: "" }],
      is_shared: false, team_id: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("student_notes").insert(newNote);
    if (error) { toast({ title: "Failed to create note", description: error.message, variant: "destructive" }); return; }
    setNotes(prev => [newNote, ...prev]);
    setSelectedId(newNote.id);
    setEditingTitle(true);
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("student_notes").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const navigateToNote = (title: string) => {
    const target = notes.find(n => n.title === title);
    if (target) setSelectedId(target.id);
  };

  // ── Group notes by subject ──
  const filteredNotes = notes.filter(n => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.subject?.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q));
  });

  const groupedNotes: Record<string, StudentNote[]> = {};
  filteredNotes.forEach(n => {
    const key = n.subject || "No subject";
    if (!groupedNotes[key]) groupedNotes[key] = [];
    groupedNotes[key].push(n);
  });

  const toggleGroup = (key: string) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] overflow-hidden animate-fade-in">
      {/* ── Left Sidebar ── */}
      <div className="w-64 shrink-0 border-r border-border/40 flex flex-col bg-card/30">
        <div className="p-3 border-b border-border/40 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2"><NotebookPen className="h-4 w-4 text-primary" /> Notes</h2>
            <Button size="icon" className="h-7 w-7" onClick={createNote}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="pl-8 h-8 text-xs" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded-lg glass-subtle animate-pulse" />)
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <NotebookPen className="h-10 w-10 text-muted-foreground opacity-30" strokeWidth={1} />
              <p className="text-xs text-muted-foreground">No notes yet</p>
              <Button size="sm" className="gap-1.5 text-xs" onClick={createNote}><Plus className="h-3 w-3" /> Create your first note</Button>
            </div>
          ) : (
            Object.entries(groupedNotes).map(([group, groupNotes]) => (
              <div key={group}>
                <button onClick={() => toggleGroup(group)}
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[10px] font-bold uppercase text-muted-foreground tracking-wider hover:text-foreground transition-colors">
                  {collapsedGroups[group] ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {group} <span className="text-muted-foreground/60 ml-auto">{groupNotes.length}</span>
                </button>
                {!collapsedGroups[group] && groupNotes.map(note => (
                  <button key={note.id} onClick={() => setSelectedId(note.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-xs border group ${
                      selectedId === note.id ? "bg-primary/10 border-primary/30 text-primary" : "border-transparent hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate flex-1">{note.title || "Untitled"}</p>
                      <button onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                        className="opacity-0 group-hover:opacity-100 text-destructive h-4 w-4 flex items-center justify-center rounded transition-opacity ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                    </p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          {selectedNote ? (
            <>
              {/* Metadata bar */}
              <div className="p-4 border-b border-border/40 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    {editingTitle ? (
                      <Input ref={titleRef} autoFocus value={selectedNote.title}
                        onChange={e => updateSelected({ title: e.target.value })}
                        onBlur={() => setEditingTitle(false)}
                        onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
                        className="text-2xl font-bold h-auto py-0 border-0 bg-transparent focus-visible:ring-0 px-0" />
                    ) : (
                      <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1.5 text-left min-w-0 group">
                        <h1 className="text-2xl font-bold tracking-tight truncate">{selectedNote.title || "Untitled Note"}</h1>
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                      </button>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Input value={selectedNote.subject || ""} placeholder="Subject" className="h-7 text-xs w-36"
                          onChange={e => { updateSelected({ subject: e.target.value || null }); setShowSubjectSuggestions(true); }}
                          onFocus={() => setShowSubjectSuggestions(true)} onBlur={() => setTimeout(() => setShowSubjectSuggestions(false), 150)} />
                        {showSubjectSuggestions && subjectSuggestions.filter(s => s.toLowerCase().includes((selectedNote.subject || "").toLowerCase())).length > 0 && (
                          <div className="absolute top-full left-0 mt-1 z-50 glass-card border border-border/60 rounded-lg shadow-xl w-48 py-1">
                            {subjectSuggestions.filter(s => s.toLowerCase().includes((selectedNote.subject || "").toLowerCase())).map(s => (
                              <button key={s} className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted/50 transition-colors"
                                onMouseDown={e => { e.preventDefault(); updateSelected({ subject: s }); setShowSubjectSuggestions(false); }}>
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Input value={selectedNote.topic || ""} placeholder="Topic" className="h-7 text-xs w-36"
                        onChange={e => updateSelected({ topic: e.target.value || null })} />
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedNote.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] cursor-pointer gap-0.5 pr-1 hover:bg-destructive/10 transition-colors" onClick={() => toggleTag(tag)}>
                          {tag} <X className="h-2.5 w-2.5" />
                        </Badge>
                      ))}
                      <div className="relative">
                        <button onClick={() => setShowTagPicker(v => !v)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-dashed border-border/50 rounded-full px-2 py-0.5 transition-colors">
                          <Tag className="h-2.5 w-2.5" /> Add tag
                        </button>
                        <AnimatePresence>
                          {showTagPicker && (
                            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.12 }}
                              className="absolute top-7 left-0 z-50 glass-card border border-border/60 p-2 rounded-xl shadow-xl min-w-[220px] flex flex-wrap gap-1">
                              {PRESET_TAGS.map(tag => (
                                <button key={tag} onClick={() => { toggleTag(tag); setShowTagPicker(false); }}
                                  className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                                    selectedNote.tags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"
                                  }`}>
                                  {tag}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all ${
                      saveStatus === "saving" ? "text-primary" : saveStatus === "saved" ? "text-success" : "text-muted-foreground"
                    }`}>
                      {saveStatus === "saving" ? <Cloud className="h-3.5 w-3.5 animate-pulse" /> :
                       saveStatus === "saved" ? <Check className="h-3.5 w-3.5" /> :
                       <Cloud className="h-3.5 w-3.5" />}
                      {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setStudyMode(true)} disabled={!API_KEY}>
                      <BookOpen className="h-3.5 w-3.5" /> Study Mode
                    </Button>
                  </div>
                </div>
              </div>

              {/* Block editor */}
              <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-1">
                {selectedNote.blocks.map((block, idx) => (
                  <NoteBlockRow
                    key={block.id} block={block}
                    isEditing={editingBlockId === block.id}
                    allNotes={notes}
                    onFocus={() => setEditingBlockId(block.id)}
                    onBlur={() => setEditingBlockId(null)}
                    onChange={(c) => updateBlock(idx, c)}
                    onAdd={() => addBlock(idx)}
                    onRemove={() => removeBlock(idx)}
                    onChangeType={(t) => changeBlockType(idx, t)}
                    onCheck={(c) => toggleCheck(idx, c)}
                    onNavigateLink={navigateToNote}
                  />
                ))}

                {/* Add block area */}
                <button onClick={() => addBlock(selectedNote.blocks.length - 1)}
                  className="w-full text-left px-2 py-4 text-xs text-muted-foreground hover:text-foreground opacity-40 hover:opacity-100 transition-opacity">
                  Click here or press Enter to add a block...
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <NotebookPen className="h-12 w-12 mx-auto text-muted-foreground opacity-20" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">Select a note or create a new one</p>
                <Button size="sm" className="gap-1.5" onClick={createNote}><Plus className="h-3.5 w-3.5" /> New Note</Button>
              </div>
            </div>
          )}
        </div>

        {/* Study Mode Panel */}
        <AnimatePresence>
          {studyMode && selectedNote && (
            <StudyModePanel note={selectedNote} onClose={() => setStudyMode(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
