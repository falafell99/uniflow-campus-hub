import { useState, useRef, useEffect } from "react";
import {
  Send, Sparkles, User, Copy, Check,
  Loader2, BookOpen, Zap, RotateCcw, Paperclip, X, FileText, History as HistoryIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/GlassCard";
import { UserAvatar } from "@/components/UserAvatar";
import LatexRenderer from "@/components/LatexRenderer";
import { useAuth } from "@/contexts/AuthContext";
import { VaultFilePicker } from "@/components/VaultFilePicker";
import { supabase } from "@/lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";
import { ChatHistorySidebar } from "./ChatHistorySidebar";

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

// ─── System prompt tuned for ELTE CS ─────────────────────────────────────────
const SYSTEM_PROMPT = `You are the AI Oracle — a helpful, expert academic assistant for students at ELTE Faculty of Informatics, Budapest. 

Your role:
- Help students understand CS concepts (algorithms, linear algebra, discrete math, probability, databases, operating systems, etc.)
- Explain things clearly with examples and when relevant, use LaTeX math notation like $x^2$ for inline and $$\\sum_{i=1}^n i$$ for block math
- Be encouraging and pedagogical, not just giving answers but helping students learn
- Reference ELTE course materials when relevant (Prof. Nagy, Prof. Kovács, Prof. Szabó, Prof. Tóth, Prof. Varga)
- Keep responses concise but thorough — use markdown formatting (bold, bullet points) for clarity
- If asked about exam tips, provide strategic study advice for ELTE exams

Always be friendly, academically rigorous, and helpful. You're a brilliant study partner.`;

// ─── Quick prompt chips ───────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "Explain eigenvalues and eigenvectors",
  "What is the Master Theorem for recursion?",
  "Explain P vs NP problem simply",
  "How does dynamic programming work?",
  "Explain Bayes' theorem with an example",
  "What are the ACID properties in databases?",
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: API_KEY
        ? "Hello! I'm your **AI Oracle** — powered by Llama 3.3 ✨\n\nI'm here to help you understand CS concepts, solve problems, and prepare for ELTE exams. Ask me anything!\n\nTip: Click the 📎 button below to attach a lecture from **The Vault** — I'll answer questions specifically about that document."
        : "⚠️ **AI not configured.** Add your Groq API key to `.env.local`:\n\n```\nVITE_GROQ_API_KEY=your_key_here\n```\n\nGet a **free** key (no card needed) at [console.groq.com](https://console.groq.com)",
    },
  ]);
  const [input, setInput] = useState("");
  const [studyMode, setStudyMode] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading, streamContent]);

  // Auto-attach file if navigated from Vault's "Ask AI" button
  useEffect(() => {
    const stateFile = (location.state as any)?.attachFile;
    if (stateFile?.name && stateFile?.storagePath) {
      handleAttachFile(stateFile);
      navigate("/ai-oracle", { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      toast({ title: "Could not read file", description: err.message, variant: "destructive" });
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
      toast({ title: "API key missing", description: "Add VITE_GROQ_API_KEY to .env.local", variant: "destructive" });
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

    try {
      // Build system prompt — inject document context if available
      let sysPrompt = SYSTEM_PROMPT;
      if (contextText) {
        sysPrompt += `\n\n---\n## ATTACHED DOCUMENT: "${contextFile?.name}"\n\nUse the following document as your PRIMARY source. Quote from it directly when relevant. If the question cannot be answered from the document, say so.\n\n${contextText.slice(0, 24000)}\n---`;
      }
      if (studyMode) {
        sysPrompt += "\n\nSTUDY MODE: Ask Socratic follow-up questions to guide the student's thinking instead of giving direct answers immediately.";
      }

      const chatMessages = [
        { role: "system", content: sysPrompt },
        ...messages.slice(1).slice(-10).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
        { role: "user", content: query },
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
      toast({ title: "AI Error", description: errMsg, variant: "destructive" });
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
        : "Chat cleared! Ask me anything about your ELTE courses.",
    }]);
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            🤖 AI Oracle
            {API_KEY && <Badge variant="outline" className="text-[10px] gap-1 h-5 bg-success/10 text-success border-success/20"><Zap className="h-2.5 w-2.5" /> Live</Badge>}
          </h1>
          <p className="text-muted-foreground mt-1">Your personal ELTE research assistant</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => setHistoryOpen(!historyOpen)}>
            <HistoryIcon className="h-3.5 w-3.5" />History
          </Button>
          <div className="flex items-center gap-2 glass-subtle px-3 py-1.5 rounded-full">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Study Mode</span>
            <Switch checked={studyMode} onCheckedChange={setStudyMode} />
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={clearChat}>
            <RotateCcw className="h-3.5 w-3.5" />Clear
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <ChatHistorySidebar 
          open={historyOpen} 
          onClose={() => setHistoryOpen(false)} 
          onSelectSession={loadSession}
          activeSessionId={sessionId}
        />
      {/* Active context banner */}
      {contextFile && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 shrink-0 border ${extractingContext ? "bg-muted/30 border-border/40" : "bg-primary/5 border-primary/20"}`}>
          {extractingContext ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-primary shrink-0" />
          )}
          <span className="text-xs font-semibold flex-1 truncate">
            {extractingContext ? "Reading document..." : `Context: ${contextFile.name}`}
          </span>
          {!extractingContext && (
            <button onClick={clearContext} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Chat area */}
      <div ref={chatRef} className="flex-1 glass-card p-5 overflow-y-auto space-y-5 mb-4 custom-scroll min-h-0">
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

        {/* Live streaming */}
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
      {messages.length === 1 && API_KEY && !contextFile && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <GlassCard padding="p-3" className="flex gap-2 items-end shrink-0">
        {/* Attach from Vault button */}
        <Button
          variant="ghost"
          size="icon"
          className={`shrink-0 h-9 w-9 ${contextFile ? "text-primary" : "text-muted-foreground"}`}
          onClick={() => setVaultPickerOpen(true)}
          disabled={extractingContext}
          title="Attach context from Vault"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Textarea
          ref={inputRef}
          placeholder={
            contextFile
              ? `Ask about "${contextFile.name}"...`
              : studyMode
                ? "Ask a study question (Socratic mode)..."
                : "Ask anything about your ELTE courses..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          className="border-0 bg-transparent focus-visible:ring-0 resize-none min-h-[40px] max-h-[120px]"
          rows={1}
          disabled={loading || extractingContext}
        />
        <Button onClick={() => sendMessage()} size="icon" className="shrink-0 h-9 w-9" disabled={loading || !input.trim() || extractingContext}>
          <Send className="h-4 w-4" />
        </Button>
      </GlassCard>
      <p className="text-center text-[10px] text-muted-foreground mt-2">
        📎 Attach lecture PDFs from The Vault · Press Enter to send · Powered by Llama 3.3 + PDF.js
      </p>

      <VaultFilePicker
        open={vaultPickerOpen}
        onOpenChange={setVaultPickerOpen}
        onSelect={handleAttachFile}
      />
    </div>
  </div>
  );
}
