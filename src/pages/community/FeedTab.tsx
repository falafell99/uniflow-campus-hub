import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, NotebookPen, HelpCircle, CheckCircle, Users, Calendar, Rss, Loader2, MessageSquare, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";

type FeedItem = {
  id: string;
  action_type: string;
  entity_id: string | null;
  entity_title: string | null;
  entity_subject: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
};

const ACTION_LABELS: Record<string, string> = {
  file_uploaded:    "uploaded a file",
  note_shared:      "shared a note",
  question_asked:   "asked a question",
  question_answered:"answered a question",
  joined_group:     "joined a study group",
  meetup_created:   "created a meetup",
  forum_post:       "posted in Forums",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  file_uploaded:    <FileText className="h-4 w-4 text-blue-400" />,
  note_shared:      <NotebookPen className="h-4 w-4 text-purple-400" />,
  question_asked:   <HelpCircle className="h-4 w-4 text-orange-400" />,
  question_answered:<CheckCircle className="h-4 w-4 text-green-400" />,
  joined_group:     <Users className="h-4 w-4 text-primary" />,
  meetup_created:   <Calendar className="h-4 w-4 text-pink-400" />,
  forum_post:       <MessageSquare className="h-4 w-4 text-blue-400" />,
};

const FILTER_MAP: Record<string, string> = {
  Files:     "file_uploaded",
  Questions: "question_asked",
  Notes:     "note_shared",
  Groups:    "joined_group",
};

// Extracted skeleton component
const SkeletonCard = () => (
  <div className="bg-card/50 border border-border/20 rounded-2xl p-4 flex gap-3 animate-pulse">
    <div className="h-9 w-9 rounded-full bg-border/40 shrink-0" />
    <div className="flex-1 space-y-3 py-1">
      <div className="h-3 w-1/3 bg-border/40 rounded-full" />
      <div className="h-12 w-full bg-border/20 rounded-xl" />
      <div className="h-2 w-16 bg-border/30 rounded-full" />
    </div>
  </div>
);

export default function FeedTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [limit, setLimit] = useState(30);
  const [, setTick] = useState(0);

  const [postOpen, setPostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);

  // Auto-refresh relative timestamps every 60s
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchFeed = async (currentLimit = limit) => {
    const { data: feedData } = await supabase
      .from("activity_feed")
      .select("*, profiles!user_id(display_name)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(currentLimit);

    const { data: vaultFiles } = await supabase
      .from("vault_files")
      .select("id, name, subject, uploader, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.max(10, currentLimit / 2));

    const { data: forumThreads } = await supabase
      .from("forum_posts")
      .select("id, title, author, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.max(5, currentLimit / 3));

    const synthetic: FeedItem[] = [
      ...(vaultFiles || []).map(f => ({
        id: `vault-${f.id}`,
        action_type: "file_uploaded",
        entity_id: String(f.id),
        entity_title: f.name,
        entity_subject: f.subject,
        created_at: f.created_at,
        profiles: { display_name: f.uploader },
      })),
      ...(forumThreads || []).map(t => ({
        id: `forum-${t.id}`,
        action_type: "forum_post",
        entity_id: String(t.id),
        entity_title: t.title,
        entity_subject: null,
        created_at: t.created_at,
        profiles: { display_name: t.author },
      })),
    ];

    const allItems = [...(feedData as FeedItem[] || []), ...synthetic]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, currentLimit);

    setFeedItems(allItems);
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchFeed(limit);
    const channel1 = supabase.channel("feed-realtime-community")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, () => fetchFeed(limit))
      .subscribe();
    const channel2 = supabase.channel("feed-realtime-forums")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_posts" }, () => fetchFeed(limit))
      .subscribe();
    return () => { channel1.unsubscribe(); channel2.unsubscribe(); };
  }, [limit]);

  const handlePost = async () => {
    if (!postTitle.trim() || !user) return;
    setPosting(true);
    const author = user.user_metadata?.display_name || user.email?.split("@")[0] || "Anonymous";
    
    const { error } = await supabase.from("forum_posts").insert({
      title: postTitle.trim(),
      content: postBody.trim() || "No description provided.",
      category: "general",
      tags: ["Discussion"],
      author,
      author_id: user.id,
      upvotes: 0,
      pinned: false
    });
    
    setPosting(false);
    if (!error) {
      setPostOpen(false);
      setPostTitle("");
      setPostBody("");
      fetchFeed(limit);
    }
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    setLimit(prev => prev + 20);
  };

  const filtered = activeFilter === "All"
    ? feedItems
    : feedItems.filter(i => i.action_type === FILTER_MAP[activeFilter]);

  return (
    <div className="max-w-2xl mx-auto p-6 pb-24">
      {/* Post box */}
      <div className="bg-card flex gap-3 border border-border/40 rounded-2xl p-4 mb-6 relative overflow-hidden group hover:border-primary/30 transition-all">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {user?.user_metadata?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?"}
        </div>
        <button
          onClick={() => setPostOpen(true)}
          className="flex-1 bg-background border border-border/30 rounded-xl px-4 py-2.5 text-sm text-muted-foreground text-left hover:border-primary/40 transition-all cursor-text flex items-center justify-between group-hover:bg-muted/30"
        >
          <span>Share something with the community...</span>
          <Plus className="h-4 w-4 text-muted-foreground opacity-50" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["All", "Files", "Questions", "Notes", "Groups"].map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeFilter === filter
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-24">
          <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4 border border-border/30">
            <Rss className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">Nothing here yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Be the first to share something with the community!</p>
          <Button onClick={() => navigate("/vault")} className="gap-2">
            Upload a file →
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card border border-border/40 rounded-2xl p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {item.profiles?.display_name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-bold text-foreground">{item.profiles?.display_name}</span>
                    <span className="text-muted-foreground"> {ACTION_LABELS[item.action_type] || item.action_type}</span>
                  </p>
                  
                  {item.entity_title && (
                    <div className="mt-2.5 flex items-center gap-2.5 bg-background border border-border/30 rounded-xl px-3.5 py-2.5 group-hover:border-primary/20 transition-colors">
                      {ACTION_ICONS[item.action_type]}
                      <span className="text-sm font-semibold truncate text-foreground/90">{item.entity_title}</span>
                      {item.entity_subject && (
                        <span className="text-[10px] font-medium text-muted-foreground border border-border/40 px-2 py-0.5 rounded-full shrink-0">
                          {item.entity_subject}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs font-medium text-muted-foreground/60 mt-3 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    {formatDistanceToNow(new Date(item.created_at))} ago
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          
          {filtered.length >= limit && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore} className="rounded-full px-6">
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load more activity
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {/* Post Modal */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Share with Community
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input
                placeholder="What's on your mind?"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description (Optional)</label>
              <Textarea
                placeholder="Add more details..."
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                className="resize-none min-h-[100px]"
              />
            </div>
            <Button
              className="w-full gap-2 mt-2"
              onClick={handlePost}
              disabled={!postTitle.trim() || posting}
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post to Forums"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
