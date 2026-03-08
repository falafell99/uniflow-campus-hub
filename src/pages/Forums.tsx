import { useState } from "react";
import { MessageSquare, ThumbsUp, Clock, User, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const threads = [
  {
    id: 1, category: "general", title: "Tips for surviving first semester at ELTE Informatics?",
    author: "Bence M.", time: "2h ago", replies: 12, upvotes: 34, pinned: true,
    preview: "Hey everyone! I'm starting my BSc CS journey next month. Any advice from seniors?",
    tags: ["Freshman", "Tips"],
  },
  {
    id: 2, category: "technical", title: "Help with BFS vs DFS - when to use which?",
    author: "Eszter N.", time: "5h ago", replies: 8, upvotes: 21,
    preview: "I'm confused about when to use BFS vs DFS for graph traversal problems. Can someone explain with examples?",
    tags: ["Algorithms", "Help"],
  },
  {
    id: 3, category: "technical", title: "Eigenvalue decomposition not clicking for me",
    author: "Ahmed K.", time: "1d ago", replies: 15, upvotes: 28,
    preview: "I understand what eigenvalues are individually but the decomposition A = PDP⁻¹ isn't making sense. Help?",
    tags: ["Linear Algebra", "Help"],
  },
  {
    id: 4, category: "career", title: "Summer internship opportunities in Budapest for CS students",
    author: "Dániel T.", time: "2d ago", replies: 23, upvotes: 56,
    preview: "Compiling a list of companies hiring CS interns in Budapest. Feel free to add!",
    tags: ["Internship", "Career"],
  },
  {
    id: 5, category: "general", title: "Best cafés near campus for studying?",
    author: "Anna K.", time: "3d ago", replies: 19, upvotes: 42,
    preview: "Looking for quiet cafés with good WiFi near ELTE's Lágymányos campus. Any recommendations?",
    tags: ["Campus Life"],
  },
];

export default function Forums() {
  const [expandedThread, setExpandedThread] = useState<number | null>(null);

  const ThreadCard = ({ t }: { t: typeof threads[0] }) => (
    <div className="glass-card p-4 space-y-2 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedThread(expandedThread === t.id ? null : t.id)}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6"><ArrowUp className="h-3.5 w-3.5" /></Button>
          <span className="text-xs font-semibold">{t.upvotes}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {t.pinned && <Badge className="text-[10px] bg-primary/10 text-primary border-0">📌 Pinned</Badge>}
            <h3 className="font-medium text-sm">{t.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.preview}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.author}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.time}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{t.replies} replies</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            {t.tags.map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
          </div>
        </div>
        {expandedThread === t.id ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>
      {expandedThread === t.id && (
        <div className="ml-9 mt-3 pt-3 border-t space-y-3">
          <div className="glass-subtle p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">MK</span>
              </div>
              <span className="text-xs font-medium">Márton K.</span>
              <span className="text-[10px] text-muted-foreground">1h ago</span>
            </div>
            <p className="text-sm">Great question! I'd recommend checking out the AI Oracle for quick explanations, and joining the study groups section for collaborative learning.</p>
          </div>
          <Textarea placeholder="Write a reply..." className="text-sm" rows={2} />
          <Button size="sm" className="text-xs">Post Reply</Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">💬 Community Forums</h1>
          <p className="text-muted-foreground mt-1">Discuss, ask, and share with fellow students</p>
        </div>
        <Button className="gap-2"><MessageSquare className="h-4 w-4" /> New Thread</Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General Chat</TabsTrigger>
          <TabsTrigger value="technical">Technical Help</TabsTrigger>
          <TabsTrigger value="career">Career Advice</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4 space-y-3">
          {threads.filter((t) => t.category === "general").map((t) => <ThreadCard key={t.id} t={t} />)}
        </TabsContent>
        <TabsContent value="technical" className="mt-4 space-y-3">
          {threads.filter((t) => t.category === "technical").map((t) => <ThreadCard key={t.id} t={t} />)}
        </TabsContent>
        <TabsContent value="career" className="mt-4 space-y-3">
          {threads.filter((t) => t.category === "career").map((t) => <ThreadCard key={t.id} t={t} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
