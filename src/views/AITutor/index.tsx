import { useState, useRef, useEffect } from "react";
import {
  Send, Sparkles, User, Copy, Check,
  Loader2, BookOpen, Zap, RotateCcw, Paperclip, X, FileText, History as HistoryIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { UserAvatar } from "@/components/UserAvatar";
import LatexRenderer from "@/components/LatexRenderer";
import { useAuth } from "@/contexts/AuthContext";
import { VaultFilePicker } from "@/components/VaultFilePicker";
import { supabase } from "@/lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { logActivity } from "@/lib/activity";
import { HintBubble } from "@/components/HintBubble";

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

const BASE_SYSTEM_PROMPT = `You are the AI Oracle — a helpful, expert academic assistant. 

Your role:
- Help students understand concepts (science, math, engineering, humanities, etc.)
- Explain things clearly with examples and when relevant, use LaTeX math notation like $x^2$ for inline and $$\\sum_{i=1}^n i$$ for block math
- Be encouraging and pedagogical, not just giving answers but helping students learn
- Reference relevant course materials and maintain academic rigor
- Keep responses concise but thorough — use markdown formatting (bold, bullet points) for clarity
- Provide strategic study advice for university-level exams

Always be friendly, professionally academic, and helpful. You're a brilliant study partner.`;

// ─── Quick prompt chips ───────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "Explain this concept with a simple example",
  "What are the key points I should remember?",
  "Give me practice problems on this topic",
  "Explain the difference between X and Y",
  "How does this apply in real life?",
  "Create a summary I can use for revision",
];

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ─── Extract text from a PDF via PDF.js (Client-side) ────────────────────────
async function extractTextFromPDF(storagePath: string): Promise<string> {
  // Get signed URL for the file
  const { data } = await supabase.storage.from("vault").createSignedUrl(storagePath, 60);
  if (!data?.signedUrl) throw new Error("Could not get file URL");

  // Fetch the file as ArrayBuffer
  const response = await fetch(data.signedUrl);
  const arrayBuffer = await response.arrayBuffer();

  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF library not loaded");

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  if (!fullText.trim()) throw new Error("No text found in PDF");
  return fullText;
}

export default function AITutor() {
  const { user } = useAuth();
  const location = useLocation();
  const vaultFile = location.state?.vaultFile;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [studyMode, setStudyMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfContext, setPdfContext] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [streamContent, setStreamContent] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Vault context state
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [contextFile, setContextFile] = useState<{ name: string; storagePath: string } | null>(null);
  const [contextText, setContextText] = useState<string | null>(null);
  const [extractingContext, setExtractingContext] = useState(false);

  // Chat History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading, streamContent]);

  // Auto-attach file if navigated from Vault's "Ask Oracle" button
  useEffect(() => {
    if (vaultFile?.storage_path || vaultFile?.storagePath) {
      const path = vaultFile.storage_path || vaultFile.storagePath;
      extractTextFromPDF(path)
        .then(text => {
          setPdfContext(text);
          setMessages([{
            id: Date.now(),
            role: "assistant",
            content: "File **" + vaultFile.name + "** loaded. Ask any question about its content."
          }]);
        })
        .catch(() => toast.error("Failed to load file from Vault"));
    }
  }, [vaultFile]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          role: "assistant",
          content: API_KEY
            ? "Hello! I'm your **AI Oracle** — powered by Llama 3.3 ✨\n\nI'm here to help you understand your course concepts, solve problems, and prepare for your exams. Ask me anything!\n\nTip: Click the 📎 button below to attach a file from **The Vault** — I'll answer questions specifically about that document."
            : "⚠️ **AI not configured.** Add your Groq API key to `.env.local`:\n\n```\nVITE_GROQ_API_KEY=your_key_here\n```\n\nGet a **free** key (no card needed) at [console.groq.com](https://console.groq.com)",
        },
      ]);
    }
  }, [API_KEY, messages.length]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const handleAttachFile = async (file: { name: string; storagePath: string }) => {
    setContextFile(file);
    setContextText(null);
    setExtractingContext(true);

    try {
      const text = await extractTextFromPDF(file.storagePath);
      setContextText(text);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "assistant",
        content: `📎 I've read **${file.name}** and I'm ready to answer questions about it!\n\nAsk me anything: explain a concept, find a proof, summarize a section, or quiz yourself on its content.`,
      }]);
    } catch (err: any) {
      toast.error("Could not read file: " + err.message);
      setContextFile(null);
    } finally {
      setExtractingContext(false);
    }
  };

  const clearContext = () => {
    setContextFile(null);
    setContextText(null);
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: "assistant",
      content: "Context cleared. I'm back to general mode — ask me anything!",
    }]);
  };

  const loadSession = async (id: string, title: string) => {
    setSessionId(id);
    setHistoryOpen(false);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", id)
        .order("created_at", { ascending: true });
      
      if (!error && data) {
        setMessages([
          { id: 1, role: "assistant", content: `You're viewing the chat: **${title}**` },
          ...data.map((m: any, idx: number) => ({
            id: idx + 2,
            role: m.role as "user" | "assistant",
            content: m.content
          }))
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async (sId: string, role: "user" | "assistant", content: string) => {
    await supabase.from("chat_messages").insert({
      session_id: sId,
      role,
      content
    });
  };

  const sendMessage = async (text?: string) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    if (!API_KEY) {
      toast.error("API key missing: Add VITE_GROQ_API_KEY to .env.local");
      return;
    }

    let currentSessionId = sessionId;

    // Create session if first non-greeting message
    if (!currentSessionId && user) {
      const title = query.length > 50 ? query.slice(0, 47) + "..." : query;
      const { data } = await supabase
        .from("chat_sessions")
        .insert({ title, user_id: user.id })
        .select("id")
        .single();
      if (data?.id) {
        currentSessionId = data.id;
        setSessionId(data.id);
      }
    }

    const userMsgId = Date.now();
    const userMsg: Message = { id: userMsgId, role: "user", content: query };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);
    setStreamContent("");

    // Persist user message
    if (currentSessionId) saveMessage(currentSessionId, "user", query);

    // Build system prompt — personalize with profile data
    let sysPrompt = BASE_SYSTEM_PROMPT;
    
    if (profile) {
      sysPrompt += `\n\nCOMMUNITY CONTEXT: You are assisting a student who identified their academic details as:
- University: ${profile.university || "Not specified"}
- Faculty: ${profile.faculty || "Not specified"}
- Major: ${profile.major || "Not specified"}
- Year of Study: ${profile.year_of_study || "Not specified"}
- Description: ${profile.bio || "None provided"}`;
    }

    if (contextText) {
      sysPrompt += `\n\n---\n## ATTACHED DOCUMENT: "${contextFile?.name}"\n\nUse the following document as your PRIMARY source. Quote from it directly when relevant. If the question cannot be answered from the document, say so.\n\n${contextText.slice(0, 24000)}\n---`;
    }
    
    if (studyMode) {
      sysPrompt += "\n\nSTUDY MODE: Ask Socratic follow-up questions to guide the student's thinking instead of giving direct answers immediately.";
    }

    try {
      const chatMessages = [
        { role: "system", content: sysPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: query }
      ];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: chatMessages,
          stream: true,
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            fullText += delta;
            setStreamContent(fullText);
          } catch { /* skip */ }
        }
      }

      const assistantMsgId = Date.now() + 1;
      setMessages((p) => [...p, { id: assistantMsgId, role: "assistant", content: fullText }]);
      logActivity("oracle_query");
      
      // Persist assistant message
      if (currentSessionId) saveMessage(currentSessionId, "assistant", fullText);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      const assistantErrId = Date.now() + 1;
      setMessages((p) => [...p, {
        id: assistantErrId,
        role: "assistant",
        content: `❌ **Error:** ${errMsg}\n\nCheck your API key or try again.`,
        error: true,
      }]);
      toast.error("AI Error: " + errMsg);
    } finally {
      setLoading(false);
      setStreamContent("");
      inputRef.current?.focus();
    }
  };

  const copyMsg = (msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setSessionId(null);
    setMessages([{
      id: Date.now(),
      role: "assistant",
      content: contextFile
        ? `Chat cleared! I still have **${contextFile.name}** attached. Ask me anything about it.`
        : "Chat cleared! Ask me anything about your courses.",
    }]);
  };

  return (
    <div className="h-[calc(100dvh-10rem)] md:h-[calc(100vh-5rem)] flex flex-col animate-fade-in relative">
      <ChatHistorySidebar 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
        onSelectSession={loadSession}
        activeSessionId={sessionId}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2 md:mb-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 truncate">
            🤖 <span className="truncate">AI Oracle</span>
            {API_KEY && <Badge variant="outline" className="text-[9px] md:text-[10px] gap-1 h-5 bg-success/10 text-success border-success/20 shrink-0"><Zap className="h-2.5 w-2.5" /> <span className="hidden xs:inline">Live</span></Badge>}
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5 md:mt-1 hidden sm:block">Ask anything — math, code, theory. Attach a PDF to ask questions about it.</p>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-1.5 text-xs text-muted-foreground" title="History" onClick={() => setHistoryOpen(!historyOpen)}>
            <HistoryIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">History</span>
          </Button>
          <div className="flex items-center gap-1.5 md:gap-2 glass-subtle px-2 md:px-3 py-1 rounded-full border border-border/20">
            <BookOpen className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
            <span className="text-[10px] md:text-xs font-medium hidden xs:inline">Study</span>
            <Switch checked={studyMode} onCheckedChange={setStudyMode} className="scale-75 md:scale-100" />
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-1.5 text-xs text-muted-foreground" title="Clear Chat" onClick={clearChat}>
            <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <div ref={chatRef} className="flex-1 glass-card p-3 sm:p-5 overflow-y-auto space-y-4 md:space-y-5 mb-3 sm:mb-4 custom-scroll min-h-0">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""} animate-fade-in`}>
              {msg.role === "assistant" && <UserAvatar Icon={Sparkles} className="mt-1 shrink-0" />}
              <div className={`max-w-[80%] ${
                msg.role === "user"
                  ? "rounded-2xl rounded-br-sm px-4 py-2.5 bg-primary/5 border border-primary/20"
                  : msg.error
                    ? "rounded-2xl rounded-bl-sm px-4 py-3 bg-destructive/5 border border-destructive/20"
                    : "rounded-2xl rounded-bl-sm px-4 py-3 bg-muted/60 border border-border/40"
              }`}>
                {msg.role === "assistant"
                  ? <LatexRenderer content={msg.content} />
                  : <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                }
                {msg.role === "assistant" && !msg.error && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/20">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => copyMsg(msg)}>
                      {copiedId === msg.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      {copiedId === msg.id ? "Copied" : "Copy"}
                    </Button>
                  </div>
                )}
              </div>
              {msg.role === "user" && <UserAvatar Icon={User} colorClass="bg-muted" className="mt-1 shrink-0 [&_svg]:text-muted-foreground" />}
            </div>
          ))}

          {loading && streamContent && (
            <div className="flex gap-3 animate-fade-in">
              <UserAvatar Icon={Sparkles} className="mt-1 shrink-0" />
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 bg-muted/60 border border-border/40">
                <LatexRenderer content={streamContent} />
                <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
              </div>
            </div>
          )}

          {loading && !streamContent && (
            <div className="flex gap-3 animate-fade-in">
              <UserAvatar Icon={Sparkles} className="mt-1 shrink-0" />
              <div className="glass-subtle rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && API_KEY && !pdfContext && (
          <div className="flex overflow-x-auto gap-2 mb-3 shrink-0 pb-1 hide-scrollbar -mx-1 px-1">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap whitespace-nowrap shrink-0"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input area */}
        <div className="shrink-0 space-y-2">
          {pdfContext && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-xs text-primary rounded-lg animate-fade-in">
              <FileText className="h-3 w-3" />
              <span>Context: {vaultFile?.name}</span>
              <button 
                onClick={() => { setPdfContext(""); setMessages([]); }} 
                className="ml-auto opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          <GlassCard padding="p-3" className="flex gap-2 items-end">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className={`shrink-0 h-9 w-9 ${pdfContext ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => setVaultPickerOpen(true)}
                disabled={loading}
                title="Attach context from Vault"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <HintBubble
                id="oracle-attach"
                message="💡 Attach a PDF from your Vault and ask questions about it!"
                position="top"
                className="-top-14 left-0"
              />
            </div>

            <Textarea
              ref={inputRef}
              placeholder={
                pdfContext
                  ? `Ask about "${vaultFile?.name}"...`
                  : studyMode
                    ? "Ask a study question (Socratic mode)..."
                    : "Ask anything about your courses..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              className="border-0 bg-transparent focus-visible:ring-0 resize-none min-h-[40px] max-h-[120px]"
              rows={1}
              disabled={loading}
            />
            <Button onClick={() => sendMessage()} size="icon" className="shrink-0 h-9 w-9" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </GlassCard>
          <p className="text-center text-[10px] text-muted-foreground hidden sm:block">
            📎 Attach lecture PDFs from The Vault · Press Enter to send · Powered by Llama 3.3 + PDF.js
          </p>
        </div>
      </div>

      <VaultFilePicker
        open={vaultPickerOpen}
        onOpenChange={setVaultPickerOpen}
        onSelect={handleAttachFile}
      />
    </div>
  );
}
