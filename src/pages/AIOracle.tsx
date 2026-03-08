import { useState } from "react";
import { Send, Bot, User, BookOpen, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

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

export default function AIOracle() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [studyMode, setStudyMode] = useState(false);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: input }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1, role: "assistant",
          content: "That's a great question! Based on the course materials from ELTE's Faculty of Informatics, here's what I found...\n\n*This is a demo response. In production, this would be powered by RAG over your uploaded course materials.*",
          sources: [{ title: "Course Material Reference", page: "p. 1" }],
        },
      ]);
    }, 1000);
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
      <div className="flex-1 glass-card p-4 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
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
            </div>
            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="glass-card p-3 flex gap-2">
        <Input
          placeholder={studyMode ? "Ask a study question..." : "Ask anything about your courses..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="border-0 bg-transparent focus-visible:ring-0"
        />
        <Button onClick={sendMessage} size="icon" className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
