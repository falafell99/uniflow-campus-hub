import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, NotebookPen, HelpCircle, CheckCircle, Users, Calendar, Rss, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

type FeedItem = {
  id: string;
  action_type: string;
  entity_id: string | null;
  entity_title: string | null;
  entity_subject: string | null;
  created_at: string;
  profiles: { display_name: string; avatar_color: string | null; avatar_emoji: string | null } | null;
};

const ACTION_LABELS: Record<string, string> = {
  file_uploaded: "uploaded a file",
  note_shared: "shared a note",
  question_asked: "asked a question",
  question_answered: "answered a question",
  joined_group: "joined a study group",
  meetup_created: "created a meetup",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  file_uploaded: <FileText className="h-4 w-4 text-blue-400" />,
  note_shared: <NotebookPen className="h-4 w-4 text-purple-400" />,
  question_asked: <HelpCircle className="h-4 w-4 text-orange-400" />,
  question_answered: <CheckCircle className="h-4 w-4 text-green-400" />,
  joined_group: <Users className="h-4 w-4 text-primary" />,
  meetup_created: <Calendar className="h-4 w-4 text-pink-400" />,
};

const FILTER_MAP: Record<string, string> = {
  Files: "file_uploaded",
  Questions: "question_asked",
  Notes: "note_shared",
  Groups: "joined_group",
};

export default function Feed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchFeed = async () => {
    const { data } = await supabase
      .from("activity_feed")
      .select("*, profiles!user_id(display_name, avatar_color, avatar_emoji)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(30);
    setFeedItems((data as FeedItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, () => fetchFeed())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const filtered = activeFilter === "All"
    ? feedItems
    : feedItems.filter(i => i.action_type === FILTER_MAP[activeFilter]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black">Community Feed</h1>
        <div className="flex gap-2">
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
    </div>
  );
}
