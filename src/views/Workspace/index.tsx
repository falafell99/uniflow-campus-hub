import {
  useState, useCallback, useEffect, useRef, KeyboardEvent
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bold, Heading1, Heading2, List, Code, Plus, Trash2, GripVertical,
  Cloud, Check, Search, Tag, X, Edit2, CheckSquare, Minus,
  FileText, Users, LayoutTemplate, ChevronRight, Info, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { logActivity } from "@/lib/activity";

// ─── Types ────────────────────────────────────────────────────────────────────
type BlockType = "paragraph" | "h1" | "h2" | "bullet" | "code" | "checklist" | "divider";
type Block = { id: string; type: BlockType; content: string; checked?: boolean };
type Note = {
  id: string;
  user_id: string;
  title: string;
  tags: string[];
  blocks: Block[];
  updated_at: string;
  team_id?: string | null;
  subject?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESET_TAGS = [
  "Linear Algebra", "Calculus", "Algorithms", "Discrete Math",
  "Probability", "OS", "Programming", "Exam Prep", "Lecture Notes", "Personal"
];

const SLASH_COMMANDS = [
  { label: "Heading 1", type: "h1" as BlockType, icon: <Heading1 className="h-4 w-4" />, description: "Big section heading" },
  { label: "Heading 2", type: "h2" as BlockType, icon: <Heading2 className="h-4 w-4" />, description: "Medium section heading" },
  { label: "Bullet List", type: "bullet" as BlockType, icon: <List className="h-4 w-4" />, description: "Simple bullet point" },
  { label: "Checklist", type: "checklist" as BlockType, icon: <CheckSquare className="h-4 w-4" />, description: "Track tasks" },
  { label: "Code Block", type: "code" as BlockType, icon: <Code className="h-4 w-4" />, description: "Code snippet" },
  { label: "Divider", type: "divider" as BlockType, icon: <Minus className="h-4 w-4" />, description: "Visual separator" },
  { label: "Paragraph", type: "paragraph" as BlockType, icon: <Bold className="h-4 w-4" />, description: "Plain text" },
];

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES: { name: string; emoji: string; description: string; blocks: Block[] }[] = [
  {
    name: "Class Notes",
    emoji: "📘",
    description: "Structured lecture notes",
    blocks: [
      { id: "t1", type: "h1", content: "Class Notes" },
      { id: "t2", type: "paragraph", content: "📅 Date: " },
      { id: "t3", type: "paragraph", content: "📚 Subject / Topic: " },
      { id: "t4", type: "h2", content: "Key Points" },
      { id: "t5", type: "checklist", content: "Point 1", checked: false },
      { id: "t6", type: "checklist", content: "Point 2", checked: false },
      { id: "t7", type: "checklist", content: "Point 3", checked: false },
      { id: "t8", type: "h2", content: "Summary" },
      { id: "t9", type: "paragraph", content: "" },
      { id: "t10", type: "h2", content: "Questions to Follow Up" },
      { id: "t11", type: "bullet", content: "" },
    ],
  },
  {
    name: "Study Session",
    emoji: "📝",
    description: "Plan and track your study time",
    blocks: [
      { id: "s1", type: "h1", content: "Study Session" },
      { id: "s2", type: "paragraph", content: "🎯 Goal for today: " },
      { id: "s3", type: "h2", content: "Topics to Cover" },
      { id: "s4", type: "checklist", content: "Topic 1", checked: false },
      { id: "s5", type: "checklist", content: "Topic 2", checked: false },
      { id: "s6", type: "h2", content: "Notes" },
      { id: "s7", type: "paragraph", content: "" },
      { id: "s8", type: "h2", content: "Code Snippets" },
      { id: "s9", type: "code", content: "// Your code here" },
    ],
  },
  {
    name: "Exam Prep",
    emoji: "🎯",
    description: "Ready for your next exam",
    blocks: [
      { id: "e1", type: "h1", content: "Exam Prep" },
      { id: "e2", type: "paragraph", content: "📅 Exam Date: " },
      { id: "e3", type: "paragraph", content: "📚 Subject: " },
      { id: "e4", type: "h2", content: "Chapters / Topics" },
      { id: "e5", type: "checklist", content: "Chapter 1", checked: false },
      { id: "e6", type: "checklist", content: "Chapter 2", checked: false },
      { id: "e7", type: "h2", content: "Weak Areas" },
      { id: "e8", type: "bullet", content: "" },
      { id: "e9", type: "h2", content: "Practice Questions" },
      { id: "e10", type: "paragraph", content: "" },
      { id: "e11", type: "h2", content: "Formulas to Remember" },
      { id: "e12", type: "code", content: "" },
    ],
  },
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

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ─── Slash Command Menu ───────────────────────────────────────────────────────
function SlashMenu({
  search,
  position,
  onSelect,
  onClose
}: {
  search: string;
  position: { top: number; left: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtered = SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => { setIdx(0); }, [search]);
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = "auto";
        menuRef.current.style.right = "0";
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = "auto";
        menuRef.current.style.bottom = "100%";
      }
    }
  }, [position, filtered.length]);

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
      ref={menuRef}
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      style={{ position: "fixed", top: position.top, left: position.left, zIndex: 9999 }}
      className="bg-card border border-border/40 rounded-xl shadow-xl overflow-hidden w-64 md:w-64 w-[calc(100vw-2rem)] max-w-[280px]"
    >
      <div className="px-3 py-2 border-b border-border/20">
        <p className="text-xs text-muted-foreground font-medium">Block type</p>
      </div>
      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground px-3 py-2">No matching block type</p>
      )}
      {filtered.map((cmd, i) => (
        <button
          key={cmd.type}
          onClick={() => onSelect(cmd.type)}
          onMouseEnter={() => setIdx(i)}
          className={`w-full flex items-center gap-3 px-4 py-3 min-h-[48px] text-left transition-colors ${i === idx ? "hover:bg-primary/5 bg-primary/10" : "hover:bg-primary/5"}`}
        >
          <div className={`p-1.5 rounded-md ${i === idx ? "bg-primary/20" : "bg-muted/50"}`}>
            {cmd.icon}
          </div>
          <div>
            <p className="text-xs font-medium">{cmd.label}</p>
            <p className="text-[10px] text-muted-foreground">{cmd.description}</p>
          </div>
        </button>
      ))}
    </motion.div>
  );
}

// ─── Note Link Menu (for [[ trigger) ─────────────────────────────────────────
function LinkMenu({
  notes,
  search,
  position,
  onSelect,
  onClose
}: {
  notes: Note[];
  search: string;
  position: { top: number; left: number };
  onSelect: (title: string) => void;
  onClose: () => void;
}) {
  const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase())).slice(0, 6);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.1 }}
      style={{ position: "fixed", top: position.top, left: position.left, zIndex: 9999 }}
      className="glass-card border border-border/60 rounded-xl shadow-2xl w-56 py-1 overflow-hidden"
    >
      <p className="text-[10px] text-muted-foreground px-3 py-1">LINK TO NOTE</p>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground px-3 py-2 italic">No notes found</p>
      ) : (
        filtered.map(n => (
          <button
            key={n.id}
            onClick={() => onSelect(n.title)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs truncate">{n.title}</span>
          </button>
        ))
      )}
    </motion.div>
  );
}

// ─── Single Block Row ─────────────────────────────────────────────────────────
function BlockRow({
  block,
  isEditing,
  allNotes,
  onFocus,
  onBlur,
  onChange,
  onAdd,
  onRemove,
  onChangeType,
  onCheck,
}: {
  block: Block;
  isEditing: boolean;
  allNotes: Note[];
  onFocus: () => void;
  onBlur: () => void;
  onChange: (content: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  onChangeType: (type: BlockType) => void;
  onCheck?: (checked: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  // Slash command state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashSearch, setSlashSearch] = useState("");
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });

  // Link menu state
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkPos, setLinkPos] = useState({ top: 0, left: 0 });
  const [linkTriggerIdx, setLinkTriggerIdx] = useState(-1);

  const getMenuPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    const rect = textareaRef.current.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      if (slashOpen) return;
      onAdd();
    }
    if (e.key === "Backspace" && block.content === "" && block.type !== "h1") {
      e.preventDefault();
      onRemove();
    }
    if (e.key === "Escape") {
      setSlashOpen(false);
      setLinkOpen(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Slash command trigger
    const slashIdx = val.lastIndexOf("/");
    if (slashIdx >= 0 && slashIdx === val.length - 1) {
      setSlashPos(getMenuPosition());
      setSlashOpen(true);
      setSlashSearch("");
    } else if (slashOpen) {
      const afterSlash = val.slice(val.lastIndexOf("/") + 1);
      if (val.includes("/") && !afterSlash.includes(" ")) {
        setSlashSearch(afterSlash);
      } else {
        setSlashOpen(false);
      }
    }

    // [[ link trigger
    const dblBracket = val.lastIndexOf("[[");
    if (dblBracket >= 0) {
      const afterBracket = val.slice(dblBracket + 2);
      if (!afterBracket.includes("]]")) {
        setLinkSearch(afterBracket);
        setLinkPos(getMenuPosition());
        setLinkOpen(true);
        setLinkTriggerIdx(dblBracket);
      }
    } else {
      setLinkOpen(false);
    }
  };

  const applySlash = (type: BlockType) => {
    setSlashOpen(false);
    onChangeType(type);
    // Remove the slash + search text from content
    const slashIdx = block.content.lastIndexOf("/");
    if (slashIdx >= 0) onChange(block.content.slice(0, slashIdx));
  };

  const applyLink = (title: string) => {
    setLinkOpen(false);
    // Replace [[search with [[Title]]
    const before = block.content.slice(0, linkTriggerIdx);
    onChange(`${before}[[${title}]] `);
  };

  if (block.type === "divider") {
    return (
      <div
        className="group relative flex items-center gap-1 my-2"
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
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
      <div
        ref={rowRef}
        className="group relative flex items-start gap-2"
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        <div className={`flex items-center gap-0.5 pt-1 transition-opacity ${showToolbar ? "opacity-100" : "opacity-0"}`}>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd}><Plus className="h-3 w-3" /></Button>
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        <input
          type="checkbox"
          checked={!!block.checked}
          onChange={e => onCheck?.(e.target.checked)}
          className="mt-1 h-4 w-4 rounded accent-primary shrink-0"
        />
        {isEditing ? (
          <div className="flex-1 relative">
            <AnimatePresence>
              {slashOpen && <SlashMenu search={slashSearch} position={slashPos} onSelect={applySlash} onClose={() => setSlashOpen(false)} />}
              {linkOpen && <LinkMenu notes={allNotes} search={linkSearch} position={linkPos} onSelect={applyLink} onClose={() => setLinkOpen(false)} />}
            </AnimatePresence>
            <Textarea
              ref={textareaRef}
              autoFocus
              value={block.content}
              onChange={handleChange}
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              style={{ fontSize: "16px", minHeight: "44px", padding: "12px" }}
              className={`border-0 bg-transparent resize-none p-0 focus-visible:ring-0 min-h-0 text-base md:text-sm ${block.checked ? "line-through text-muted-foreground" : ""}`}
              rows={1}
            />
          </div>
        ) : (
          <div
            onClick={onFocus}
            className={`flex-1 cursor-text text-sm py-0.5 hover:bg-muted/40 rounded px-1 transition-colors ${block.checked ? "line-through text-muted-foreground" : ""} ${!block.content ? "italic text-muted-foreground" : ""}`}
          >
            {renderInlineLinks(block.content) || "To-do"}
          </div>
        )}
        {showToolbar && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      className="group relative flex items-start gap-1"
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
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
            {/* Mini block type toolbar */}
            <div className="flex items-center gap-0.5 glass-subtle p-1 rounded-md w-fit">
              {([
                ["h1", <Heading1 className="h-3.5 w-3.5" />],
                ["h2", <Heading2 className="h-3.5 w-3.5" />],
                ["paragraph", <Bold className="h-3.5 w-3.5" />],
                ["bullet", <List className="h-3.5 w-3.5" />],
                ["checklist", <CheckSquare className="h-3.5 w-3.5" />],
                ["code", <Code className="h-3.5 w-3.5" />],
              ] as [BlockType, React.ReactNode][]).map(([t, icon]) => (
                <Button key={t} variant={block.type === t ? "default" : "ghost"} size="icon" className="h-6 w-6" onClick={() => onChangeType(t)}>
                  {icon}
                </Button>
              ))}
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              ref={textareaRef}
              autoFocus
              value={block.content}
              onChange={handleChange}
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              className={`border-0 bg-transparent resize-none p-0 focus-visible:ring-0 min-h-0 ${typeStyles[block.type]} ${block.type === "bullet" ? "pl-4" : ""}`}
              rows={block.type === "code" ? 4 : 1}
            />
          </div>
        ) : (
          <div
            onClick={onFocus}
            className={`cursor-text rounded px-1 py-0.5 hover:bg-muted/40 transition-colors ${typeStyles[block.type]} ${block.type === "bullet" ? "before:content-['•'] before:mr-2 before:text-primary flex" : ""} ${!block.content ? "text-muted-foreground italic" : ""}`}
          >
            {renderInlineLinks(block.content) || "Click to type..."}
          </div>
        )}
      </div>
    </div>
  );
}

// Renders [[Note Title]] as blue clickable spans
function renderInlineLinks(text: string): React.ReactNode {
  if (!text || !text.includes("[[")) return text;
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[\[(.*?)\]\]$/);
        if (match) {
          return (
            <span key={i} className="text-primary underline underline-offset-2 cursor-pointer hover:text-primary/80 transition-colors">
              {match[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Templates Picker ─────────────────────────────────────────────────────────
function TemplatesPicker({ onApply }: { onApply: (blocks: Block[]) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => setOpen(v => !v)}>
        <LayoutTemplate className="h-3.5 w-3.5" /> Templates
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute top-9 left-0 z-50 glass-card border border-border/60 rounded-xl shadow-xl w-64 p-2 space-y-1"
          >
            {TEMPLATES.map(t => (
              <button
                key={t.name}
                onClick={() => { onApply(t.blocks.map(b => ({ ...b, id: uid() }))); setOpen(false); }}
                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
              >
                <span className="text-xl">{t.emoji}</span>
                <div>
                  <p className="text-xs font-medium">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.description}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Presence Avatars ─────────────────────────────────────────────────────────
type PresenceState = { display_name: string; color: string };
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function PresenceAvatars({ noteId, user }: { noteId: string | null; user: { id: string; email?: string; user_metadata?: { display_name?: string } } | null }) {
  const [others, setOthers] = useState<PresenceState[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!noteId || !user) return;
    const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Anonymous";
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    channelRef.current = supabase.channel(`workspace-presence-${noteId}`, {
      config: { presence: { key: user.id } },
    });

    channelRef.current
      .on("presence", { event: "sync" }, () => {
        const state = channelRef.current?.presenceState<PresenceState>() ?? {};
        const otherUsers = Object.entries(state)
          .filter(([key]) => key !== user.id)
          .map(([, v]) => v[0]);
        setOthers(otherUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channelRef.current?.track({ display_name: displayName, color });
        }
      });

    return () => { channelRef.current?.unsubscribe(); };
  }, [noteId, user]);

  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Users className="h-3.5 w-3.5 text-muted-foreground" />
      {others.map((o, i) => (
        <div key={i} className="relative group">
          <div
            className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: o.color, outline: `2px solid ${o.color}`, outlineOffset: "2px" }}
          >
            {o.display_name.slice(0, 1).toUpperCase()}
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {o.display_name}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Workspace ───────────────────────────────────────────────────────────
export default function Workspace() {
  const { user } = useAuth();
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  // Find backlinks: other notes that contain [[selectedNote.title]]
  const backlinks = selectedNote
    ? notes.filter(n =>
        n.id !== selectedNote.id &&
        n.blocks.some(b => b.content.includes(`[[${selectedNote.title}]]`))
      )
    : [];

  // ── Load all notes ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (data && data.length > 0) {
        setNotes(data as Note[]);
        setSelectedId((data[0] as Note).id);
      }
      setLoading(false);
    };

    const fetchTeams = async () => {
      const { data } = await supabase.from('team_members').select('team_id, teams(id, name)').eq('user_id', user.id).eq('status', 'accepted');
      if (data) {
        setUserTeams(data.map((m: any) => Array.isArray(m.teams) ? m.teams[0] : m.teams).filter(Boolean));
      }
    };

    load();
    fetchTeams();
  }, [user]);

  // ── Handle Prefill from Calendar ──────────────────────────────────────────
  useEffect(() => {
    if (!user || loading) return;
    
    const prefill = location.state as { prefillTitle?: string; prefillDate?: string } | null;
    if (prefill?.prefillTitle) {
      const newNote: Note = {
        id: crypto.randomUUID(),
        user_id: user?.id ?? "",
        title: prefill.prefillTitle,
        tags: ["Exam Prep"],
        blocks: [
          { id: crypto.randomUUID(), type: "h1", content: prefill.prefillTitle },
          { id: crypto.randomUUID(), type: "paragraph", content: prefill.prefillDate ? "📅 Due: " + format(new Date(prefill.prefillDate), "PPP") : "" },
          { id: crypto.randomUUID(), type: "paragraph", content: "" }
        ],
        updated_at: new Date().toISOString()
      };
      setNotes(prev => [newNote, ...prev]);
      setSelectedId(newNote.id);
      window.history.replaceState({}, "");
    }
  }, [user, loading, location.state, navigate]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const saveNote = useCallback(async (note: Note) => {
    if (!user) return;
    setSaveStatus("saving");
    await supabase
      .from("notes")
      .update({ 
        title: note.title, 
        tags: note.tags, 
        blocks: note.blocks, 
        team_id: note.team_id || null,
        updated_at: new Date().toISOString() 
      })
      .eq("id", note.id);
    logActivity("note_saved", note.subject || undefined);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [user]);

  const scheduleSave = (note: Note) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNote(note), 800);
  };

  const updateSelected = (patch: Partial<Note>) => {
    if (!selectedNote) return;
    const updated = { ...selectedNote, ...patch };
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    scheduleSave(updated);
  };

  // ── Block operations ────────────────────────────────────────────────────────
  const addBlock = useCallback((afterId: string) => {
    if (!selectedNote) return;
    const newBlock: Block = { id: uid(), type: "paragraph", content: "" };
    const idx = selectedNote.blocks.findIndex(b => b.id === afterId);
    const next = [...selectedNote.blocks];
    next.splice(idx + 1, 0, newBlock);
    updateSelected({ blocks: next });
    setTimeout(() => setEditingBlockId(newBlock.id), 50);
  }, [selectedNote]);

  const removeBlock = (id: string) => {
    if (!selectedNote || selectedNote.blocks.length <= 1) return;
    const blocks = selectedNote.blocks.filter(b => b.id !== id);
    updateSelected({ blocks });
    setEditingBlockId(null);
  };

  const updateBlockContent = (id: string, content: string) => {
    if (!selectedNote) return;
    updateSelected({ blocks: selectedNote.blocks.map(b => b.id === id ? { ...b, content } : b) });
  };

  const changeBlockType = (id: string, type: BlockType) => {
    if (!selectedNote) return;
    updateSelected({ blocks: selectedNote.blocks.map(b => b.id === id ? { ...b, type } : b) });
  };

  const checkBlock = (id: string, checked: boolean) => {
    if (!selectedNote) return;
    updateSelected({ blocks: selectedNote.blocks.map(b => b.id === id ? { ...b, checked } : b) });
  };

  // ── Create/delete notes ─────────────────────────────────────────────────────
  const createNote = async () => {
    if (!user) return;
    const blank = {
      user_id: user.id,
      title: "Untitled Note",
      tags: [] as string[],
      blocks: [{ id: uid(), type: "h1" as BlockType, content: "Untitled Note" }],
      updated_at: new Date().toISOString(),
    };
    const { data } = await supabase.from("notes").insert(blank).select().single();
    if (data) {
      setNotes(prev => [data as Note, ...prev]);
      setSelectedId((data as Note).id);
      setTimeout(() => setEditingBlockId((data as Note).blocks[0].id), 100);
    }
  };

  const deleteNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    const remaining = notes.filter(n => n.id !== id);
    setNotes(remaining);
    setSelectedId(remaining[0]?.id ?? null);
  };

  const toggleTag = (tag: string) => {
    if (!selectedNote) return;
    const tags = selectedNote.tags.includes(tag)
      ? selectedNote.tags.filter(t => t !== tag)
      : [...selectedNote.tags, tag];
    updateSelected({ tags });
  };

  // ── Filtered note list ──────────────────────────────────────────────────────
  const filteredNotes = notes.filter((n) => {
    const matchesSearch = !search.trim() ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesTag = !activeTag || n.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const allTags = [...new Set(notes.flatMap(n => n.tags))].sort();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div><p className="text-4xl mb-3">📝</p><p className="font-medium">Sign in to use Workspace</p></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] pb-16 md:pb-0 flex flex-col gap-4 relative overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/5 border border-amber-500/20 text-xs text-amber-500 rounded-xl shrink-0">
        <Info className="h-4 w-4 shrink-0" />
        <span>Workspace is being migrated to Notes. <button onClick={() => navigate("/notes")} className="underline font-bold hover:text-amber-400">Go to Notes →</button></span>
      </div>
      <div className="flex-1 min-h-0 flex gap-4 relative">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div className={`${mobileView === "list" ? "flex" : "hidden"} md:flex w-full md:w-60 shrink-0 flex-col gap-2 bg-background md:bg-transparent absolute inset-0 md:relative z-20`}>
        <Button size="sm" className="w-full gap-2 text-xs" onClick={createNote}>
          <Plus className="h-3.5 w-3.5" /> New Note
        </Button>
        <TemplatesPicker onApply={(blocks) => {
          const title = blocks.find(b => b.type === "h1")?.content || "New Note";
          createNoteWithContent(title, blocks);
        }} />

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="pl-8 h-8 text-base md:text-xs" style={{ fontSize: "16px" }} />
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeTag && (
              <button onClick={() => setActiveTag(null)} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] border border-primary bg-primary/10 text-primary">
                <X className="h-2.5 w-2.5" /> Clear
              </button>
            )}
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                  activeTag === tag
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/50 text-muted-foreground hover:border-primary/50"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Note list */}
        <div className="flex-1 overflow-y-auto custom-scroll space-y-0.5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg glass-subtle animate-pulse" />)
            : filteredNotes.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-6 italic">{search || activeTag ? "No notes match" : "No notes yet"}</p>
              : filteredNotes.map(note => (
                <button
                  key={note.id}
                  onClick={() => { setSelectedId(note.id); setMobileView("editor"); }}
                  className={`w-full text-left px-3 py-3 md:py-2.5 rounded-lg transition-all text-xs border group min-h-[44px] ${
                    selectedId === note.id
                      ? "bg-primary/10 border-primary/30 text-foreground"
                      : "border-transparent hover:bg-emerald-500/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate flex-1">{note.title || "Untitled"}</p>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                      className="opacity-0 group-hover:opacity-100 text-destructive h-4 w-4 flex items-center justify-center rounded transition-opacity ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {note.tags.slice(0, 2).map(t => (
                        <span key={t} className="px-1.5 py-0 rounded-full bg-primary/10 text-primary text-[10px]">{t}</span>
                      ))}
                      {note.tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{note.tags.length - 2}</span>}
                    </div>
                  )}
                </button>
              ))
          }
        </div>
      </div>

      {/* ── Editor ──────────────────────────────────────────── */}
      <div className={`${mobileView === "editor" ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0 absolute md:relative inset-0 bg-background z-10 overflow-hidden`}>
        {selectedNote ? (
          <>
            {/* Mobile back button & header */}
            <div className="md:hidden flex items-center justify-between p-3 border-b border-border/20 sticky top-0 bg-background/95 backdrop-blur z-30 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setMobileView("list")} className="h-8 gap-1.5 -ml-2 text-xs min-h-[44px]">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <span className="text-sm font-semibold truncate flex-1 mx-2 text-center">{selectedNote.title || "Untitled"}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}</span>
              </div>
            </div>

            {/* Note header */}
            <div className="flex items-start justify-between mb-4 gap-2 px-4 md:px-0">
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <Input
                    ref={titleRef}
                    autoFocus
                    value={selectedNote.title}
                    onChange={e => updateSelected({ title: e.target.value })}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
                    className="text-xl font-bold h-auto py-0 border-0 bg-transparent focus-visible:ring-0 px-0"
                  />
                ) : (
                  <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1.5 text-left min-w-0 group">
                    <h1 className="text-xl font-bold tracking-tight truncate">{selectedNote.title || "Untitled Note"}</h1>
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                  </button>
                )}

                {/* Tags */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {selectedNote.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] cursor-pointer gap-0.5 pr-1 hover:bg-destructive/10 transition-colors"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag} <X className="h-2.5 w-2.5" />
                    </Badge>
                  ))}
                  <div className="relative">
                    <button
                      onClick={() => setShowTagPicker(v => !v)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-dashed border-border/50 rounded-full px-2 py-0.5 transition-colors"
                    >
                      <Tag className="h-2.5 w-2.5" /> Add tag
                    </button>
                    
                    {/* Team assignment */}
                    {userTeams.length > 0 && (
                      <select
                        value={selectedNote.team_id || ""}
                        onChange={(e) => updateSelected({ team_id: e.target.value || null })}
                        className="bg-transparent border border-dashed border-border/50 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground outline-none cursor-pointer"
                      >
                        <option value="" className="bg-[#1a1a1a]">No team</option>
                        {userTeams.map(team => (
                          <option key={team.id} value={team.id} className="bg-[#1a1a1a]">{team.name}</option>
                        ))}
                      </select>
                    )}
                    <AnimatePresence>
                      {showTagPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.12 }}
                          className="absolute top-7 left-0 z-50 glass-card border border-border/60 p-2 rounded-xl shadow-xl min-w-[220px] flex flex-wrap gap-1"
                        >
                          {PRESET_TAGS.map(tag => (
                            <button
                              key={tag}
                              onClick={() => { toggleTag(tag); setShowTagPicker(false); }}
                              className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                                selectedNote.tags.includes(tag)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border/50 text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <PresenceAvatars noteId={selectedId} user={user} />
                <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all ${
                  saveStatus === "saving" ? "text-primary" :
                  saveStatus === "saved" ? "text-success" : "text-muted-foreground"
                }`}>
                  {saveStatus === "saving" ? <Cloud className="h-3.5 w-3.5 animate-pulse" /> :
                   saveStatus === "saved" ? <Check className="h-3.5 w-3.5" /> :
                   <Cloud className="h-3.5 w-3.5" />}
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Cloud sync"}
                </div>
              </div>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-muted-foreground mb-3">
              Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">/</kbd> for blocks · <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">[[</kbd> to link notes
            </p>

            {/* Blocks */}
            <div className="flex-1 overflow-y-auto custom-scroll">
              <div className="max-w-2xl mx-auto space-y-1 pb-32">
                {selectedNote.blocks.map(block => (
                  <BlockRow
                    key={block.id}
                    block={block}
                    isEditing={editingBlockId === block.id}
                    allNotes={notes}
                    onFocus={() => setEditingBlockId(block.id)}
                    onBlur={() => setEditingBlockId(null)}
                    onChange={(content) => updateBlockContent(block.id, content)}
                    onAdd={() => addBlock(block.id)}
                    onRemove={() => removeBlock(block.id)}
                    onChangeType={(type) => changeBlockType(block.id, type)}
                    onCheck={(checked) => checkBlock(block.id, checked)}
                  />
                ))}
                <div className="pt-4 pl-8">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={() => addBlock(selectedNote.blocks[selectedNote.blocks.length - 1].id)}>
                    <Plus className="h-3.5 w-3.5" /> Add block
                  </Button>
                </div>

                {/* Backlinks section */}
                {backlinks.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5" /> Mentioned in ({backlinks.length})
                    </p>
                    <div className="space-y-1">
                      {backlinks.map(n => (
                        <button
                          key={n.id}
                          onClick={() => setSelectedId(n.id)}
                          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                        >
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-primary hover:underline">{n.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Floating Toolbar */}
            {mobileView === "editor" && (
              <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border/20 flex items-center gap-1.5 px-3 py-2 overflow-x-auto shadow-lg [-webkit-overflow-scrolling:touch]" style={{ scrollbarWidth: "none" }}>
                {[
                  { label: "H1", action: () => { if(editingBlockId){ changeBlockType(editingBlockId, "h1") } } },
                  { label: "H2", action: () => { if(editingBlockId){ changeBlockType(editingBlockId, "h2") } } },
                  { label: "•", action: () => { if(editingBlockId){ changeBlockType(editingBlockId, "bullet") } } },
                  { label: "☑", action: () => { if(editingBlockId){ changeBlockType(editingBlockId, "checklist") } } },
                  { label: "<>", action: () => { if(editingBlockId){ changeBlockType(editingBlockId, "code") } } },
                  { label: "—", action: () => { if(editingBlockId){ changeBlockType(editingBlockId, "divider") } } },
                ].map((btn) => (
                  <button key={btn.label}
                    onClick={btn.action}
                    className="h-[44px] min-w-[44px] px-3 rounded-lg bg-muted/30 text-sm font-mono font-medium text-foreground hover:bg-muted/50 transition-colors shrink-0 flex items-center justify-center"
                  >
                    {btn.label}
                  </button>
                ))}
                <div className="w-px h-6 bg-border/40 mx-2 shrink-0" />
                <button onClick={() => {
                  const targetIdx = selectedNote.blocks.findIndex(b=>b.id===editingBlockId);
                  addBlock(targetIdx > -1 ? editingBlockId! : selectedNote.blocks[selectedNote.blocks.length - 1].id)
                }} className="h-[44px] px-4 rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0 flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Block
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center p-8">
            {notes.length === 0 && !loading ? (
              <div className="max-w-md w-full glass-card p-10 rounded-3xl border border-primary/20 shadow-2xl shadow-primary/5 animate-in fade-in zoom-in duration-500">
                <div className="h-20 w-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 scale-110">
                  <Edit2 className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3 tracking-tight">Your digital brain is empty</h2>
                <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                  UniFlow Workspace is where your ideas take shape. Create your first note 
                  to start organizing your studies, lecture notes, and research.
                </p>
                <div className="space-y-3">
                  <Button onClick={createNote} size="lg" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-primary/20">
                    <Plus className="h-5 w-5 mr-2" /> Create First Note
                  </Button>
                  <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-4xl mb-3">📝</p>
                <p className="font-medium text-muted-foreground">Select a note or create one</p>
                <Button className="mt-4 gap-2" size="sm" onClick={createNote}><Plus className="h-4 w-4" /> New Note</Button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );

  async function createNoteWithContent(title: string, blocks: Block[]) {
    if (!user) return;
    const note = {
      user_id: user.id,
      title,
      tags: [] as string[],
      blocks,
      updated_at: new Date().toISOString(),
    };
    const { data } = await supabase.from("notes").insert(note).select().single();
    if (data) {
      setNotes(prev => [data as Note, ...prev]);
      setSelectedId((data as Note).id);
    }
  }
}
