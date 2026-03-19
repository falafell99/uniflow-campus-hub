import { useState, useEffect } from "react";
import { Clock, FileText, Mic, MessageSquare, Briefcase, TrendingUp, ArrowRight } from "lucide-react";
import { useMeetups } from "@/contexts/MeetupContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { FavoritesSection } from "./FavoritesSection";
import { MeetupsSection } from "./MeetupsSection";
import { TrendingSection } from "./TrendingSection";
import { UpcomingEventsSection } from "./UpcomingEventsSection";
import { LoungeActivity } from "./LoungeActivity";
import { SubjectsSection } from "./SubjectsSection";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { StudyCoach } from "@/components/StudyCoach";
import { format, differenceInDays } from "date-fns";

type VaultResource = {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  downloads: number;
  tag: string;
  tagClass: string;
};

// Fallbacks are now handled inside the component logic

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
  const { meetups, loading: meetupsLoading } = useMeetups();
  const { favorites, toggleFavorite, activeCommunity } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [liveResources, setLiveResources] = useState<VaultResource[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Stats Integration State
  const [streak, setStreak] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [nextDeadline, setNextDeadline] = useState<any>(null);
  const [daysUntilDeadline, setDaysUntilDeadline] = useState(0);

  // Real stats from Supabase
  const [vaultCount, setVaultCount] = useState(0);
  const [myUploads, setMyUploads] = useState(0);
  const [forumPosts, setForumPosts] = useState(0);
  const [voiceTimeStr, setVoiceTimeStr] = useState("0h");
  const [savedInternships, setSavedInternships] = useState(0);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Student";
  const firstName = getFirstName(displayName);

  // Load trending vault files and subjects
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const [filesRes, subjectsRes] = await Promise.all([
          supabase
            .from("vault_files")
            .select("id, name, file_type, uploader, downloads")
            .order("downloads", { ascending: false })
            .limit(4),
          supabase
            .from("vault_files")
            .select("subject")
            .not("subject", "is", null)
        ]);

        // Process Resources
        if (filesRes.data && filesRes.data.length > 0) {
          setLiveResources(
            filesRes.data.map((f) => ({
              id: String(f.id),
              title: f.name,
              author: f.uploader ?? "Unknown",
              downloads: f.downloads || 0,
              tag: f.file_type || "Notes",
              tagClass: tagClassForType(f.file_type || ""),
            }))
          );
        }

        // Process Subjects (Top 3 by file count)
        if (subjectsRes.data && subjectsRes.data.length > 0) {
          const counts: Record<string, number> = {};
          subjectsRes.data.forEach(item => {
            if (item.subject) counts[item.subject] = (counts[item.subject] || 0) + 1;
          });
          
          const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count], idx) => ({
              id: idx,
              name,
              code: name === "Linear Algebra" ? "GEIAL145" : name === "Algorithms" ? "GEIAL219" : "ELTE-CS",
              progress: Math.min(100, Math.round((count / 10) * 100)), // Mock progress formula
              color: ["bg-primary", "bg-success", "bg-warning"][idx] || "bg-primary"
            }));
          setSubjects(sorted);
        } else {
          setSubjects([
            { id: 1, name: "Linear Algebra", code: "GEIAL145", progress: 72, color: "bg-primary" },
            { id: 2, name: "Algorithms", code: "GEIAL219", progress: 58, color: "bg-success" },
            { id: 3, name: "Discrete Math", code: "GEIAL112", progress: 85, color: "bg-warning" },
          ]);
        }
      } catch (err) {
        console.error("Dashboard content load error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (activeCommunity) loadContent();
  }, [activeCommunity]);

  // Load progress stats
  useEffect(() => {
    if (!user) return;
    const loadProgressStats = async () => {
      // Activity
      const { data: activityData } = await supabase
        .from("activity_log")
        .select("created_at, action")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (activityData) {
        setWeekTotal(activityData.length);
        const dates = new Set(activityData.map(a => format(new Date(a.created_at), "yyyy-MM-dd")));
        let currentStreak = 0;
        let checkDate = new Date();
        if (dates.has(format(checkDate, "yyyy-MM-dd"))) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          checkDate.setDate(checkDate.getDate() - 1);
          if (dates.has(format(checkDate, "yyyy-MM-dd"))) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          }
        }
        while (currentStreak > 0 && dates.has(format(checkDate, "yyyy-MM-dd"))) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
        setStreak(currentStreak);
      }

      // Deadline
      const { data: deadlineData } = await supabase
        .from("campus_events")
        .select("title, start_time")
        .eq("user_id", user.id)
        .eq("event_type", "deadline")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1)
        .single();
        
      if (deadlineData) {
        setNextDeadline(deadlineData);
        setDaysUntilDeadline(differenceInDays(new Date(deadlineData.start_time), new Date()));
      }
    };
    loadProgressStats();
  }, [user]);

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

  // Filtering logic based on community
  const mathSubjects = ["Linear Algebra", "Calculus I", "Calculus II", "Discrete Math", "Probability Theory"];
  const infoSubjects = ["Algorithms", "Data Structures", "Operating Systems", "Programming"];

  const filteredMeetups = meetups.filter((m) => {
    if (activeCommunity === "personal") return true;
    if (activeCommunity === "mathematics") return mathSubjects.includes(m.subject);
    if (activeCommunity === "informatics") return infoSubjects.includes(m.subject);
    return true;
  });

  const favoriteResources = (liveResources.length > 0 ? liveResources : fallbackResources).filter((r) => favorites.includes(r.id));

  const activityStats: StatDef[] = [
    // ... same stats ...
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

  const showOnboarding = liveResources.length === 0 && vaultCount === 0 && !loading;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 px-1 mb-6 flex-wrap">
        {/* Streak */}
        <div className="flex items-center gap-2 bg-card border border-border/40 rounded-xl px-4 py-2.5 hover:border-primary/30 transition-all cursor-pointer" onClick={() => navigate("/progress")}>
          <span className="text-xl">{streak > 0 ? "🔥" : "💤"}</span>
          <div>
            <p className="text-sm font-bold leading-none">{streak} day{streak !== 1 ? "s" : ""}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Current streak</p>
          </div>
        </div>

        {/* This week */}
        <div className="flex items-center gap-2 bg-card border border-border/40 rounded-xl px-4 py-2.5 hover:border-primary/30 transition-all cursor-pointer" onClick={() => navigate("/progress")}>
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold leading-none">{weekTotal} actions</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">This week</p>
          </div>
        </div>

        {/* Next deadline countdown */}
        {nextDeadline && (
          <div className="flex items-center gap-2 bg-card border border-orange-500/20 rounded-xl px-4 py-2.5 hover:border-orange-500/40 transition-all cursor-pointer" onClick={() => navigate("/calendar")}>
            <Clock className="h-5 w-5 text-orange-400" />
            <div>
              <p className="text-sm font-bold leading-none text-orange-400">{daysUntilDeadline}d left</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[120px] truncate">{nextDeadline.title}</p>
            </div>
          </div>
        )}

        {/* View full progress */}
        <button onClick={() => navigate("/progress")} className="text-xs text-muted-foreground hover:text-primary transition-colors ml-auto flex items-center gap-1">
          Full stats <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {showOnboarding && (
        <div className="glass-card p-6 border-primary/20 bg-primary/5 rounded-3xl mb-8 flex flex-col md:flex-row items-center gap-6 shadow-2xl shadow-primary/5 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="h-20 w-20 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 scale-110">
            <TrendingUp className="h-10 w-10 text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold tracking-tight">Welcome to UniFlow! 🎓</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed max-w-xl">
              Your campus hub is currently empty. Start by exploring the <span className="text-primary font-semibold">The Vault</span> to upload lecture notes or join a <span className="text-primary font-semibold">Voice Lounge</span> to study with others in real-time.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={() => navigate("/vault")}
              className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              Explore The Vault <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Currently in <span className="text-primary font-medium">{activeCommunity === "informatics" ? "Informatics Faculty" : activeCommunity === "mathematics" ? "Mathematics Faculty" : "Your Personal Workspace"}</span>
        </p>
      </div>

      <FavoritesSection resources={favoriteResources} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MeetupsSection meetups={filteredMeetups} loading={meetupsLoading} />
          <TrendingSection
            resources={liveResources.length > 0 ? liveResources : fallbackResources}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onAuthorClick={(id) => setSelectedProfileId(id)}
            loading={loading}
          />
        </div>
        <div className="space-y-6">
          <LoungeActivity />
          <SubjectsSection subjects={subjects} loading={loading} />
          <UpcomingEventsSection />
          <StatsSection stats={activityStats} loading={statsLoading} />
        </div>
      </div>
      <PublicProfileModal userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} />
      <StudyCoach page="dashboard" />
    </div>
  );
}
