import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, FileText, Copy, Share2, Check, Loader2, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/GlassCard";
import { UserAvatar } from "@/components/UserAvatar";
import LatexRenderer from "@/components/LatexRenderer";

type Source = { title: string; page: string };
type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  streaming?: boolean;
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello! I'm your AI Research Assistant for ELTE Informatics. I can help you understand concepts, solve problems, and find relevant study materials.\n\nTry asking me about Linear Algebra, Algorithms, or any course topic!",
  },
  { id: 2, role: "user", content: "Explain eigenvalues and eigenvectors in simple terms" },
  {
    id: 3,
    role: "assistant",
    content:
      "**Eigenvalues and Eigenvectors** are fundamental concepts in Linear Algebra.\n\nAn **eigenvector** of a matrix $A$ is a non-zero vector $\\mathbf{v}$ that, when multiplied by $A$, only gets scaled:\n\n$$A \\cdot \\mathbf{v} = \\lambda \\cdot \\mathbf{v}$$\n\nThe scalar $\\lambda$ (lambda) is the **eigenvalue** — it tells you *how much* the vector gets scaled.\n\n**Example:** For the quadratic formula:\n\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\nFor matrix $A = \\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}$:\n- Eigenvalue $\\lambda_1 = 3$, Eigenvector $\\mathbf{v}_1 = [1, 1]$\n- Eigenvalue $\\lambda_2 = 1$, Eigenvector $\\mathbf{v}_2 = [-1, 1]$",
    sources: [
      { title: "Linear Algebra Lecture Notes — Prof. Kovács", page: "p. 42–45" },
      { title: "Golden Summary — Matrix Theory", page: "p. 8" },
      { title: "Past Exam 2023 — Problem Set 4", page: "Q3" },
    ],
  },
];

const demoResponses: Record<string, { content: string; sources: Source[] }> = {
  default: {
    content:
      "That's a great question! Based on the course materials from ELTE's Faculty of Informatics, here's what I found...\n\nThe key formula is:\n\n$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$\n\n*This is a demo response. In production, this would be powered by RAG over your uploaded course materials.*",
    sources: [
      { title: "Course Material Reference", page: "p. 1" },
      { title: "Algorithms & Data Structures", page: "Ch. 3" },
    ],
  },
};

export default function AITutor() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [studyMode, setStudyMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isSearching, streamingText]);

  const streamResponse = (fullContent: string, sources: Source[], msgId: number) => {
    setStreamingId(msgId);
    const words = fullContent.split(/(\s+)/);
    let idx = 0;
    let accumulated = "";
    const interval = setInterval(() => {
      if (idx < words.length) {
        accumulated += words[idx];
        setStreamingText(accumulated);
        idx++;
      } else {
        clearInterval(interval);
        setStreamingId(null);
        setStreamingText("");
        setMessages((prev) => [...prev, { id: msgId, role: "assistant", content: fullContent, sources }]);
      }
    }, 20);
  };

  const sendMessage = () => {
    if (!input.trim() || isSearching) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      const resp = demoResponses.default;
      streamResponse(resp.content, resp.sources, Date.now() + 1);
    }, 1800);
  };

  const copyMessage = (msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    toast({ title: "Copied to clipboard", description: "Response has been copied." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareMessage = (_msg: Message) => {
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
      <div ref={chatRef} className="flex-1 glass-card p-5 overflow-y-auto space-y-5 mb-4 custom-scroll">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""} animate-fade-in`}>
            {msg.role === "assistant" && (
              <UserAvatar Icon={Sparkles} className="mt-1" />
            )}
            <div
              className={`max-w-[75%] ${
                msg.role === "user"
                  ? "rounded-2xl rounded-br-sm px-4 py-2.5 bg-primary/5 border border-primary/20 text-foreground"
                  : "rounded-2xl rounded-bl-sm px-4 py-3 bg-muted/60 border border-border/40"
              }`}
            >
              {msg.role === "assistant" ? (
                <LatexRenderer content={msg.content} />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/30">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((s, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer text-[11px] font-normal gap-1 px-2 py-0.5 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                      >
                        <FileText className="h-3 w-3 text-primary" />
                        {s.title} — {s.page}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-border/20">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => copyMessage(msg)}>
                    {copiedId === msg.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    {copiedId === msg.id ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => shareMessage(msg)}>
                    <Share2 className="h-3 w-3" /> Share
                  </Button>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <UserAvatar Icon={User} colorClass="bg-muted" className="mt-1 [&_svg]:text-muted-foreground" />
            )}
          </div>
        ))}

        {/* Streaming */}
        {streamingId && (
          <div className="flex gap-3 animate-fade-in">
            <UserAvatar Icon={Sparkles} className="mt-1" />
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-3 bg-muted/60 border border-border/40">
              <LatexRenderer content={streamingText} />
              <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        )}

        {/* Searching */}
        {isSearching && (
          <div className="flex gap-3 animate-fade-in">
            <UserAvatar Icon={Sparkles} className="mt-0.5" />
            <div className="glass-subtle rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary animate-pulse" />
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
      <GlassCard padding="p-3" className="flex gap-2">
        <Input
          placeholder={studyMode ? "Ask a study question..." : "Ask anything about your courses..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="border-0 bg-transparent focus-visible:ring-0"
          disabled={isSearching || !!streamingId}
        />
        <Button onClick={sendMessage} size="icon" className="shrink-0" disabled={isSearching || !!streamingId}>
          <Send className="h-4 w-4" />
        </Button>
      </GlassCard>
    </div>
  );
}
