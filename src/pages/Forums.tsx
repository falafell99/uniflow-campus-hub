import { useState, useEffect, useRef } from "react";
import {
  MessageSquare, Clock, User, ArrowUp,
  ChevronDown, ChevronUp, Send, Plus, Loader2, Zap, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────
type Reply = {
  id: number;
  thread_id: number;
  author: string;
  content: string;
  created_at: string;
};

type Thread = {
  id: number;
  category: string;
  title: string;
  author: string;
  author_id: string;
  content: string;
  tags: string[];
  upvotes: number;
  pinned: boolean;
  created_at: string;
  replies?: Reply[];
  reply_count?: number;
};

// ─── Fallback demo threads ────────────────────────────────────────────────────
const demoThreads: Thread[] = [
  { id: 1, category: "general", title: "Tips for surviving first semester at ELTE Informatics?", author: "Bence M.", author_id: "", content: "Hey everyone! I'm starting my BSc CS journey next month. Any advice from seniors?", tags: ["Freshman", "Tips"], upvotes: 34, pinned: true, created_at: new Date(Date.now() - 7200000).toISOString(), replies: [], reply_count: 0 },
  { id: 2, category: "technical", title: "Help with BFS vs DFS — when to use which?", author: "Eszter N.", author_id: "", content: "I'm confused about when to use BFS vs DFS for graph traversal problems. Can someone explain with examples?", tags: ["Algorithms", "Help"], upvotes: 21, pinned: false, created_at: new Date(Date.now() - 18000000).toISOString(), replies: [], reply_count: 0 },
  { id: 3, category: "career", title: "Summer internship opportunities in Budapest for CS students", author: "Dániel T.", author_id: "", content: "Compiling a list of companies hiring CS interns in Budapest. Feel free to add!", tags: ["Internship", "Career"], upvotes: 56, pinned: false, created_at: new Date(Date.now() - 172800000).toISOString(), replies: [], reply_count: 0 },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Reply component ─────────────────────────────────────────────────────────
function ReplyItem({ r }: { r: Reply }) {
  return (
    <div className="glass-subtle p-3 rounded-lg space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-primary">{getInitials(r.author)}</span>
        </div>
        <span className="text-xs font-medium">{r.author}</span>
        <span className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</span>
      </div>
      <p className="text-sm text-foreground/90 pl-8">{r.content}</p>
    </div>
  );
}

// ─── Thread card ──────────────────────────────────────────────────────────────
function ThreadCard({ t, onUpvote, upvotedIds }: { t: Thread; onUpvote: (id: number) => void; upvotedIds: number[] }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<Reply[]>(t.replies || []);
  const [replyCount, setReplyCount] = useState(t.reply_count ?? replies.length);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [posting, setPosting] = useState(false);
  const { user } = useAuth();
  const alreadyUpvoted = upvotedIds.includes(t.id);

  const loadReplies = async () => {
    if (loadingReplies) return;
    setLoadingReplies(true);
    const { data } = await supabase
      .from("forum_replies")
      .select("*")
      .eq("thread_id", t.id)
      .order("created_at", { ascending: true });
    const loaded = (data as Reply[]) || [];
    setReplies(loaded);
    setReplyCount(loaded.length);
    setLoadingReplies(false);
  };

  const toggle = () => {
    if (!expanded) loadReplies();
    setExpanded((v) => !v);
  };

  const postReply = async () => {
    if (!replyText.trim()) return;
    setPosting(true);
    const author = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anonymous";
    const { data, error } = await supabase
      .from("forum_replies")
      .insert({ thread_id: t.id, author, author_id: user?.id, content: replyText.trim() })
      .select()
      .single();
    setPosting(false);
    if (error) {
      toast({ title: "Failed to post reply", variant: "destructive" });
      return;
    }
    setReplies((prev) => [...prev, data as Reply]);
    setReplyCount((c) => c + 1);
    setReplyText("");
  };

  return (
    <div className={`glass-card p-4 space-y-2 transition-all duration-300 ${t.pinned ? "border-primary/30" : ""}`}>
      <div className="flex items-start gap-3 cursor-pointer" onClick={toggle}>
        {/* Upvote */}
        <button
          className={`flex flex-col items-center gap-0.5 pt-0.5 transition-colors ${alreadyUpvoted ? "text-primary" : "hover:text-primary"}`}
          onClick={(e) => { e.stopPropagation(); if (!alreadyUpvoted) onUpvote(t.id); }}
          title={alreadyUpvoted ? "Already upvoted" : "Upvote"}
        >
          <ArrowUp className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">{t.upvotes}</span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {t.pinned && <Badge className="text-[10px] bg-primary/10 text-primary border-0">📌 Pinned</Badge>}
            <h3 className="font-medium text-sm">{t.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.content}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.author}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(t.created_at)}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {t.tags.map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
          </div>
        </div>

        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      {expanded && (
        <div className="ml-6 mt-3 pt-3 border-t border-border/30 space-y-3 animate-fade-in">
          {loadingReplies ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No replies yet — be the first!</p>
          ) : (
            replies.map((r) => <ReplyItem key={r.id} r={r} />)
          )}

          {/* Reply input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Write a reply... (Ctrl+Enter to post)"
              className="text-sm resize-none"
              rows={2}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) postReply(); }}
            />
            <Button size="sm" className="text-xs gap-1.5" onClick={postReply} disabled={posting || !replyText.trim()}>
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Post Reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Thread Dialog ────────────────────────────────────────────────────────
const CATEGORIES = ["general", "technical", "career"];
const TAG_OPTIONS = ["Help", "Exam Prep", "Tips", "Discussion", "Career", "Internship", "Freshman", "Algorithms", "Linear Algebra", "Probability", "OS", "Discrete Math"];

function NewThreadDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (t: Thread) => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  const toggleTag = (tag: string) => setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  const submit = async () => {
    if (!title.trim() || !content.trim()) { toast({ title: "Please fill title and content", variant: "destructive" }); return; }
    setPosting(true);
    const author = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anonymous";
    const { data, error } = await supabase.from("forum_posts").insert({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: selectedTags,
      author,
      author_id: user?.id,
      upvotes: 0,
      pinned: false,
    }).select().single();
    setPosting(false);
    if (error) { toast({ title: "Failed to create thread", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Thread created! 🎉" });
    onCreate({ ...(data as Thread), reply_count: 0 });
    setTitle(""); setContent(""); setCategory("general"); setSelectedTags([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> New Thread
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <Input placeholder="What's on your mind?" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`flex-1 py-1.5 rounded-lg text-xs border capitalize transition-all ${category === c ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>
                  {c === "general" ? "💬 General" : c === "technical" ? "⚙️ Technical" : "💼 Career"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-all ${selectedTags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Content *</label>
            <Textarea placeholder="Describe your question or topic in detail..." value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
          </div>

          <Button className="w-full gap-2" onClick={submit} disabled={posting}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {posting ? "Posting..." : "Post Thread"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Forums page ─────────────────────────────────────────────────────────
export default function Forums() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Upvote deduplication – persisted in localStorage
  const [upvotedIds, setUpvotedIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem("uniflow-upvoted-threads");
      if (stored) return JSON.parse(stored);
    } catch (_) { /* ignore */ }
    return [];
  });
  useEffect(() => {
    localStorage.setItem("uniflow-upvoted-threads", JSON.stringify(upvotedIds));
  }, [upvotedIds]);

  const loadThreads = async () => {
    const { data, error } = await supabase
      .from("forum_posts")
      .select("*, forum_replies(count)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const normalized = data.map((row) => ({
        ...row,
        reply_count: (row.forum_replies as unknown as { count: number }[])?.[0]?.count ?? 0,
      })) as Thread[];
      setThreads(normalized);
    } else {
      setThreads(demoThreads);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadThreads();

    channelRef.current = supabase
      .channel("forum-posts-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_posts" }, () => {
        loadThreads();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "forum_posts" }, (payload) => {
        setThreads((prev) => prev.map((t) => t.id === (payload.new as Thread).id ? { ...t, ...payload.new as Thread } : t));
      })
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    return () => { channelRef.current?.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpvote = async (id: number) => {
    const thread = threads.find((t) => t.id === id);
    if (!thread) return;
    setThreads((prev) => prev.map((t) => t.id === id ? { ...t, upvotes: t.upvotes + 1 } : t));
    setUpvotedIds((prev) => [...prev, id]);
    await supabase.from("forum_posts").update({ upvotes: thread.upvotes + 1 }).eq("id", id);
  };

  const handleNewThread = (t: Thread) => {
    setThreads((prev) => [t, ...prev.filter((x) => !x.pinned)]);
  };

  const filterThreads = (list: Thread[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      t.author.toLowerCase().includes(q)
    );
  };

  const byCategory = (cat: string) => filterThreads(threads.filter((t) => t.category === cat));
  const allFiltered = filterThreads(threads);

  const renderList = (items: Thread[]) => {
    if (loading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2" />
        </div>
      ));
    }
    if (items.length === 0) {
      return (
        <div className="glass-subtle rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">{search ? "🔍" : "💬"}</p>
          <p className="font-medium">{search ? "No threads match your search" : "No threads yet"}</p>
          <p className="text-sm text-muted-foreground mt-1">{search ? "Try different keywords" : "Start the conversation!"}</p>
          {!search && (
            <Button className="mt-4 gap-2" size="sm" onClick={() => setNewThreadOpen(true)}>
              <Plus className="h-4 w-4" /> New Thread
            </Button>
          )}
        </div>
      );
    }
    return items.map((t) => <ThreadCard key={t.id} t={t} onUpvote={handleUpvote} upvotedIds={upvotedIds} />);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">💬 Community Forums</h1>
          <p className="text-muted-foreground mt-1">Discuss, ask, and share with fellow ELTE students</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            {isLive
              ? <><Zap className="h-3 w-3 text-success" /> Live</>
              : <><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" /> Connecting</>
            }
          </Badge>
          <Button className="gap-2" onClick={() => setNewThreadOpen(true)}>
            <Plus className="h-4 w-4" /> New Thread
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search threads by title, tag, or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">📋 All ({allFiltered.length})</TabsTrigger>
          <TabsTrigger value="general">💬 General ({byCategory("general").length})</TabsTrigger>
          <TabsTrigger value="technical">⚙️ Technical ({byCategory("technical").length})</TabsTrigger>
          <TabsTrigger value="career">💼 Career ({byCategory("career").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {renderList(allFiltered)}
        </TabsContent>
        {(["general", "technical", "career"] as const).map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4 space-y-3">
            {renderList(byCategory(cat))}
          </TabsContent>
        ))}
      </Tabs>

      <NewThreadDialog open={newThreadOpen} onClose={() => setNewThreadOpen(false)} onCreate={handleNewThread} />
    </div>
  );
}
