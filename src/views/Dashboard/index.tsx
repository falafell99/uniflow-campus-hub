import { useState, useEffect } from "react";
import { Clock, FileText, Mic, MessageSquare, Briefcase, TrendingUp } from "lucide-react";
import { useMeetups } from "@/contexts/MeetupContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { FavoritesSection } from "./FavoritesSection";
import { MeetupsSection } from "./MeetupsSection";
import { TrendingSection } from "./TrendingSection";
import { SubjectsSection } from "./SubjectsSection";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicProfileModal } from "@/components/PublicProfileModal";

type VaultResource = {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  downloads: number;
  tag: string;
  tagClass: string;
};

const quickSubjects = [
  { id: 1, name: "Linear Algebra", code: "GEIAL145", progress: 72, color: "bg-primary" },
  { id: 2, name: "Algorithms & Data Structures", code: "GEIAL219", progress: 58, color: "bg-success" },
  { id: 3, name: "Discrete Mathematics", code: "GEIAL112", progress: 85, color: "bg-warning" },
];

const fallbackResources: VaultResource[] = [
  { id: "res-1", title: "Calculus II Final Cheat Sheet", author: "Anna K.", downloads: 234, tag: "Exam Prep", tagClass: "badge-exam" },
  { id: "res-2", title: "Data Structures Lecture Notes", author: "Márton B.", downloads: 189, tag: "Student Notes", tagClass: "badge-golden" },
  { id: "res-3", title: "Probability Theory Slides — Week 10", author: "Prof. Szabó", downloads: 156, tag: "Lecture Slides", tagClass: "badge-slides" },
  { id: "res-4", title: "Operating Systems Past Papers 2024", author: "Dániel T.", downloads: 142, tag: "Exam Prep", tagClass: "badge-exam" },
];

function tagClassForType(fileType: string): string {
  if (fileType === "Exam Prep") return "badge-exam";
  if (fileType === "Lecture Slides") return "badge-slides";
  return "badge-golden";
}
function getFirstName(fullName?: string) {
  if (!fullName) return "Student";
  return fullName.split(" ")[0];
}

// Read accumulated voice time from localStorage
function getVoiceTimeStr(): string {
  const secs = parseInt(localStorage.getItem("uniflow-voice-total-secs") ?? "0");
  if (!secs) return "0h";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
type StatDef = {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color: string;
};

function StatCard({ stat, loading }: { stat: StatDef; loading: boolean }) {
  return (
    <div className="glass-subtle rounded-xl p-4 flex items-start gap-3 hover:bg-muted/20 transition-colors">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
        <stat.icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        {loading ? (
          <>
            <Skeleton className="h-6 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight">{stat.value}</span>
              {stat.trend === "up" && (
                <span className="flex items-center text-[10px] text-success font-medium">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
            {stat.subtext && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.subtext}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Stats Section ────────────────────────────────────────────────────────────
function StatsSection({ stats, loading }: { stats: StatDef[]; loading: boolean }) {
  return (
    <GlassCard>
      <h2 className="text-lg font-semibold mb-4">📊 Your Activity</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} loading={loading} />
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { meetups } = useMeetups();
  const { favorites, toggleFavorite } = useApp();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [trendingResources, setTrendingResources] = useState<VaultResource[]>(fallbackResources);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Real stats from Supabase
  const [vaultCount, setVaultCount] = useState(0);
  const [myUploads, setMyUploads] = useState(0);
  const [forumPosts, setForumPosts] = useState(0);
  const [voiceTimeStr, setVoiceTimeStr] = useState("0h");
  const [savedInternships, setSavedInternships] = useState(0);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Student";
  const firstName = getFirstName(displayName);

  // Load trending vault files
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("vault_files")
        .select("id, name, uploader, uploader_id, downloads, file_type")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!error && data && data.length > 0) {
        setTrendingResources(
          data.map((f) => ({
            id: String(f.id),
            title: f.name,
            author: f.uploader,
            authorId: f.uploader_id,
            downloads: f.downloads || 0,
            tag: f.file_type || "Student Notes",
            tagClass: tagClassForType(f.file_type),
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  // Load real stats
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);

      // 1. Total vault files
      const { count: totalFiles } = await supabase
        .from("vault_files").select("id", { count: "exact", head: true });

      // 2. My uploads (by email prefix or display name)
      const uploaderName = user?.email?.split("@")[0] || displayName;
      const { count: myFiles } = await supabase
        .from("vault_files").select("id", { count: "exact", head: true })
        .ilike("uploader", `%${uploaderName}%`);

      // 3. Forum posts count (threads)
      const { count: threads } = await supabase
        .from("forum_threads").select("id", { count: "exact", head: true });

      // 4. Voice time from localStorage
      setVoiceTimeStr(getVoiceTimeStr());

      // 5. Saved internships from localStorage
      try {
        const statusMap = JSON.parse(localStorage.getItem("uniflow-internship-status") ?? "{}");
        setSavedInternships(Object.keys(statusMap).length);
      } catch { setSavedInternships(0); }

      setVaultCount(totalFiles ?? 0);
      setMyUploads(myFiles ?? 0);
      setForumPosts(threads ?? 0);
      setStatsLoading(false);
    };
    if (user) loadStats();
  }, [user, displayName]);

  const favoriteResources = trendingResources.filter((r) => favorites.includes(r.id));

  const activityStats: StatDef[] = [
    {
      label: "Files in The Vault",
      value: String(vaultCount),
      subtext: myUploads > 0 ? `${myUploads} uploaded by you` : "Add resources to help others",
      icon: FileText,
      trend: "up",
      color: "bg-primary",
    },
    {
      label: "Voice Time",
      value: voiceTimeStr,
      subtext: "Across all Voice Lounges",
      icon: Mic,
      color: "bg-success",
    },
    {
      label: "Forum Threads",
      value: String(forumPosts),
      subtext: "Active discussions",
      icon: MessageSquare,
      color: "bg-warning",
    },
    {
      label: "Internships Tracked",
      value: String(savedInternships),
      subtext: "Applications in progress",
      icon: Briefcase,
      color: "bg-rose-500",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening at ELTE Informatics today.</p>
      </div>

      <FavoritesSection resources={favoriteResources} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MeetupsSection meetups={meetups} loading={loading} />
          <TrendingSection
            resources={trendingResources}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onAuthorClick={(id) => setSelectedProfileId(id)}
            loading={loading}
          />
        </div>
        <div className="space-y-6">
          <SubjectsSection subjects={quickSubjects} loading={loading} />
          <StatsSection stats={activityStats} loading={statsLoading} />
        </div>
      </div>
      <PublicProfileModal userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} />
    </div>
  );
}
