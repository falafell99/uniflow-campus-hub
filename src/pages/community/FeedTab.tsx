import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, NotebookPen, HelpCircle, CheckCircle, Users, Calendar, Rss, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

export default function FeedTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  const [postOpen, setPostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchFeed = async () => {
    // 1. Real activity_feed entries
    const { data: feedData } = await supabase
      .from("activity_feed")
      .select("*, profiles!user_id(display_name)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    // 2. Recent vault files as synthetic feed items
    const { data: vaultFiles } = await supabase
      .from("vault_files")
      .select("id, name, subject, uploader, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // 3. Recent forum threads as synthetic feed items
    const { data: forumThreads } = await supabase
      .from("forum_posts")
      .select("id, title, author, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

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
      .slice(0, 30);

    setFeedItems(allItems);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
    const channel1 = supabase.channel("feed-realtime-community")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, fetchFeed)
      .subscribe();
    const channel2 = supabase.channel("feed-realtime-forums")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_posts" }, fetchFeed)
      .subscribe();
    return () => { channel1.unsubscribe(); channel2.unsubscribe(); };
  }, []);

  const handlePost = async () => {
    if (!postTitle.trim() || !user) return;
    setPosting(true);
    const author = user.user_metadata?.display_name || user.email?.split("@")[0] || "Anonymous";
    
    // Create a forum post directly from the feed
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
      fetchFeed();
    }
  };

  const filtered = activeFilter === "All"
    ? feedItems
    : feedItems.filter(i => i.action_type === FILTER_MAP[activeFilter]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Post box */}
      <div className="bg-card border border-border/40 rounded-2xl p-4 mb-6 flex gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {user?.email?.charAt(0).toUpperCase() || "?"}
        </div>
        <button
          onClick={() => setPostOpen(true)}
          className="flex-1 bg-background border border-border/30 rounded-xl px-4 py-2.5 text-sm text-muted-foreground text-left hover:border-primary/30 transition-all cursor-text"
        >
          Share something with the community...
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["All", "Files", "Questions", "Notes", "Groups"].map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 opacity-40">
          <Rss className="h-12 w-12 mx-auto mb-3 text-muted-foreground" strokeWidth={1} />
          <p className="font-bold">Feed is empty</p>
          <p className="text-sm text-muted-foreground">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/40 rounded-2xl p-4 hover:border-primary/20 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {item.profiles?.display_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{item.profiles?.display_name}</span>
                    <span className="text-muted-foreground"> {ACTION_LABELS[item.action_type] || item.action_type}</span>
                  </p>
                  {item.entity_title && (
                    <div className="mt-2 flex items-center gap-2 bg-background border border-border/30 rounded-xl px-3 py-2">
                      {ACTION_ICONS[item.action_type]}
                      <span className="text-sm font-medium truncate">{item.entity_title}</span>
                      {item.entity_subject && (
                        <span className="text-[11px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full shrink-0">
                          {item.entity_subject}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(item.created_at))} ago
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Post Modal */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Share with Community
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Input
                placeholder="What's on your mind? (Title)"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Add more details (optional)..."
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                className="resize-none min-h-[100px]"
              />
            </div>
            <Button
              className="w-full gap-2"
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
