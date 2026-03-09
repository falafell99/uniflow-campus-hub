import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, BookOpen, FileText, Sparkles, Copy, Share2, Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; page: string }[];
};

const initialMessages: Message[] = [
  {
    id: 1, role: "assistant",
    content: "Hello! I'm your AI Research Assistant for ELTE Informatics. I can help you understand concepts, solve problems, and find relevant study materials.\n\nTry asking me about Linear Algebra, Algorithms, or any course topic!",
  },
  {
    id: 2, role: "user",
    content: "Explain eigenvalues and eigenvectors in simple terms",
  },
  {
    id: 3, role: "assistant",
    content: "**Eigenvalues and Eigenvectors** are fundamental concepts in Linear Algebra.\n\nAn **eigenvector** of a matrix *A* is a non-zero vector **v** that, when multiplied by *A*, only gets scaled (stretched or shrunk):\n\n`A · v = λ · v`\n\nThe scalar **λ** (lambda) is the **eigenvalue** — it tells you *how much* the vector gets scaled.\n\n**Intuition:** Think of a transformation (like rotating or stretching a shape). Most vectors change direction, but eigenvectors only change in magnitude. They reveal the \"natural axes\" of the transformation.\n\n**Example:**\nFor matrix `A = [[2, 1], [1, 2]]`:\n- Eigenvalue λ₁ = 3, Eigenvector v₁ = [1, 1]\n- Eigenvalue λ₂ = 1, Eigenvector v₂ = [-1, 1]",
    sources: [
      { title: "Linear Algebra Lecture Notes - Prof. Kovács", page: "p. 42-45" },
      { title: "Golden Summary - Matrix Theory", page: "p. 8" },
    ],
  },
];

const demoResponses: Record<string, { content: string; sources: { title: string; page: string }[] }> = {
  default: {
    content: "That's a great question! Based on the course materials from ELTE's Faculty of Informatics, here's what I found...\n\n*This is a demo response. In production, this would be powered by RAG over your uploaded course materials.*",
    sources: [{ title: "Course Material Reference", page: "p. 1" }],
  },
};

export default function AIOracle() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [studyMode, setStudyMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isSearching]);

  const sendMessage = () => {
    if (!input.trim() || isSearching) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSearching(true);

    // Simulate searching animation then response
    setTimeout(() => {
      setIsSearching(false);
      const resp = demoResponses.default;
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: resp.content, sources: resp.sources },
      ]);
    }, 2200);
  };

  const copyMessage = (msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    toast({ title: "Copied to clipboard", description: "Response has been copied." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareMessage = (msg: Message) => {
    toast({ title: "Share link generated", description: "A shareable link has been copied to your clipboard." });
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🤖 AI Oracle</h1>
          <p className="text-muted-foreground mt-1">Your personal ELTE research assistant</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass-subtle px-3 py-1.5 rounded-full">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Study Mode</span>
            <Switch checked={studyMode} onCheckedChange={setStudyMode} />
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatRef} className="flex-1 glass-card p-4 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""} animate-fade-in`}>
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5" : "glass-subtle rounded-2xl rounded-bl-md px-4 py-2.5"}`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.sources && (
                <div className="mt-3 pt-2 border-t border-border/30 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sources</p>
                  {msg.sources.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                      <FileText className="h-3 w-3" />
                      <span>{s.title} — {s.page}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Copy/Share buttons for assistant messages */}
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => copyMessage(msg)}
                  >
                    {copiedId === msg.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    {copiedId === msg.id ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => shareMessage(msg)}
                  >
                    <Share2 className="h-3 w-3" /> Share
                  </Button>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Searching animation */}
        {isSearching && (
          <div className="flex gap-3 animate-fade-in">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="glass-subtle rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Searching Knowledge Base...</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Scanning course materials, lecture notes, and past exams</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="glass-card p-3 flex gap-2">
        <Input
          placeholder={studyMode ? "Ask a study question..." : "Ask anything about your courses..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="border-0 bg-transparent focus-visible:ring-0"
          disabled={isSearching}
        />
        <Button onClick={sendMessage} size="icon" className="shrink-0" disabled={isSearching}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
