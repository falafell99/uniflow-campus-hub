import { useState, useEffect, useRef } from "react";
import { Users, Upload, BookOpen, MessageSquare, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useMeetups } from "@/contexts/MeetupContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { AvatarDisplay } from "@/pages/Profile";

type Profile = { id: string; display_name: string; status: string; avatar_color?: string; avatar_emoji?: string };
type VaultFile = { id: number; name: string; subject: string; created_at: string; uploader: string };
type ForumPost = { id: number; title: string; category: string; created_at: string; author: string };

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

function statusDotColor(status: string) {
  if (status?.includes("Online") || status?.includes("Studying")) return "bg-success";
  if (status?.includes("Focusing")) return "bg-destructive";
  return "bg-warning";
}

// ─── Fallback data (shown while DB empty) ──────────────────────────────────
const fallbackProfiles: Profile[] = [
  { id: "1", display_name: "Márton B.", status: "📚 Studying" },
  { id: "2", display_name: "Eszter N.", status: "🟢 Online" },
  { id: "3", display_name: "Anna K.", status: "📚 Studying" },
  { id: "4", display_name: "Gábor L.", status: "🔴 Focusing" },
];
const fallbackUploads: VaultFile[] = [
  { id: 1, name: "Eigenvalue Proofs Summary", subject: "Linear Algebra", created_at: new Date(Date.now() - 300000).toISOString(), uploader: "Anna K." },
  { id: 2, name: "Week 12 Lecture Notes", subject: "Calculus II", created_at: new Date(Date.now() - 1380000).toISOString(), uploader: "Bence M." },
  { id: 3, name: "Past Exam 2024 Solutions", subject: "Algorithms", created_at: new Date(Date.now() - 3600000).toISOString(), uploader: "Dániel T." },
];
const fallbackPosts: ForumPost[] = [
  { id: 1, title: "Tips for first semester?", category: "general", created_at: new Date(Date.now() - 7200000).toISOString(), author: "Bence M." },
  { id: 2, title: "BFS vs DFS explained", category: "technical", created_at: new Date(Date.now() - 18000000).toISOString(), author: "Eszter N." },
];

export function ActivityFeed() {
  const { onlineUsers: globalOnlineSet } = useAuth();
  const navigate = useNavigate();
  const { meetups } = useMeetups();
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>(fallbackProfiles);
  const [recentUploads, setRecentUploads] = useState<VaultFile[]>(fallbackUploads);
  const [recentPosts, setRecentPosts] = useState<ForumPost[]>(fallbackPosts);
  const [isLive, setIsLive] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadData = async () => {
    // Online users from profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, status, avatar_color, avatar_emoji")
      .order("created_at", { ascending: false })
      .limit(8);
    if (profiles && profiles.length > 0) setOnlineUsers(profiles as Profile[]);

    // Recent uploads
    const { data: files } = await supabase
      .from("vault_files")
      .select("id, name, subject, created_at, uploader")
      .order("created_at", { ascending: false })
      .limit(5);
    if (files && files.length > 0) setRecentUploads(files as VaultFile[]);

    // Recent forum posts
    const { data: posts } = await supabase
      .from("forum_posts")
      .select("id, title, category, created_at, author")
      .order("created_at", { ascending: false })
      .limit(4);
    if (posts && posts.length > 0) setRecentPosts(posts as ForumPost[]);
  };

  useEffect(() => {
    loadData();

    // Real-time: watch for new vault files and forum posts
    channelRef.current = supabase
      .channel("activity-feed-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vault_files" }, (payload) => {
        setRecentUploads((prev) => [payload.new as VaultFile, ...prev].slice(0, 5));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_posts" }, (payload) => {
        setRecentPosts((prev) => [payload.new as ForumPost, ...prev].slice(0, 4));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        setOnlineUsers((prev) =>
          prev.map((p) => p.id === (payload.new as Profile).id ? payload.new as Profile : p)
        );
      })
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  // Active meetups = joined meetups from context
  const activeGroups = meetups
    .filter((m) => m.joined)
    .slice(0, 3)
    .map((m) => ({ name: m.topic, members: m.attendees, subject: m.subject }));

  const subjectEmoji: Record<string, string> = {
    "Linear Algebra": "📐", "Calculus I": "∫", "Calculus II": "∫",
    "Algorithms": "💻", "Data Structures": "🌳", "Discrete Math": "🧮",
    "Probability Theory": "🎲", "Operating Systems": "⚙️", "Other": "📚",
  };

  return (
    <div className="w-[240px] shrink-0 border-l border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden hidden xl:flex flex-col">

      {/* Live badge */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border/30 shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Activity</span>
        <div className={`flex items-center gap-1 text-[10px] ${isLive ? "text-success" : "text-muted-foreground"}`}>
          {isLive ? <Zap className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" />}
          {isLive ? "Live" : "Sync..."}
        </div>
      </div>

      {/* Active Study Groups (from real joined meetups) */}
      <div className="p-3 border-b border-border/30 shrink-0">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Users className="h-3 w-3" /> Active Study Groups
        </h3>
        <div className="space-y-1.5">
          {activeGroups.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic px-2">
              Join a meetup to see groups here
            </p>
          ) : (
            activeGroups.map((g) => (
              <button
                key={g.name}
                onClick={() => navigate("/meetups")}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors w-full text-left"
              >
                <span className="text-sm">{subjectEmoji[g.subject] || "📚"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{g.name}</p>
                  <p className="text-[10px] text-muted-foreground">{g.members} studying</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-success shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Who's Online (from profiles) */}
      <div className="p-3 border-b border-border/30 shrink-0">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" /> Online Now
        </h3>
        <div className="space-y-1.5">
          {onlineUsers
            .filter(u => globalOnlineSet.has(u.id))
            .slice(0, 5)
            .map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedProfileId(u.id)}
                className="flex items-center gap-2 px-1 py-1 w-full text-left rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="relative shrink-0">
                  <AvatarDisplay
                    name={u.display_name}
                    avatarColor={u.avatar_color}
                    avatarEmoji={u.avatar_emoji}
                    size="sm"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-background" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{u.display_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">Online</p>
                </div>
              </button>
            ))}
          {onlineUsers.filter(u => globalOnlineSet.has(u.id)).length === 0 && (
            <p className="text-[10px] text-muted-foreground italic px-2">No users online</p>
          )}
        </div>
      </div>

      {/* Recent Forum Activity */}
      {recentPosts.length > 0 && (
        <div className="p-3 border-b border-border/30 shrink-0">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" /> Forum Activity
          </h3>
          <div className="space-y-1.5">
            {recentPosts.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate("/forums")}
                className="px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors w-full text-left"
              >
                <p className="text-xs font-medium truncate">{p.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {p.author} · {timeAgo(p.created_at)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Uploads */}
      <div className="p-3 flex-1 overflow-y-auto custom-scroll">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Upload className="h-3 w-3" /> New Uploads
        </h3>
        <div className="space-y-1.5">
          {recentUploads.map((u) => (
            <button
              key={u.id}
              onClick={() => navigate("/vault")}
              className="px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors w-full text-left"
            >
              <p className="text-xs font-medium truncate">{u.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {u.subject} · {timeAgo(u.created_at)}
              </p>
            </button>
          ))}
        </div>
      </div>

      <PublicProfileModal userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} />
    </div>
  );
}
