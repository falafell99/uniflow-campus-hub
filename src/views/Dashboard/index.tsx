import { useState, useEffect } from "react";
import { Clock, Briefcase, TrendingUp, ArrowRight, NotebookPen, Sparkles, Upload, CalendarPlus, CalendarDays, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { format, differenceInCalendarDays, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getFirstName(fullName?: string) {
  if (!fullName) return "Student";
  return fullName.split(" ")[0];
}

function getGreeting(firstName: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return `Good morning, ${firstName} ☀️`;
  if (hour >= 12 && hour <= 17) return `Good afternoon, ${firstName} 👋`;
  if (hour >= 18 && hour <= 23) return `Good evening, ${firstName} 🌙`;
  return `Still up, ${firstName}? 🦉`;
}

const ACTION_ICONS: Record<string, string> = {
  note_saved: "📝",
  file_uploaded: "📁",
  task_completed: "✅",
  oracle_query: "🧠",
  flashcard_reviewed: "🃏",
};

const ACTION_LABELS: Record<string, string> = {
  note_saved: "Saved a note",
  file_uploaded: "Uploaded a file",
  task_completed: "Completed a task",
  oracle_query: "Asked the Oracle",
  flashcard_reviewed: "Reviewed flashcards",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { activeCommunity } = useApp();
  const navigate = useNavigate();
  
  const [streak, setStreak] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  
  const [quickAsk, setQuickAsk] = useState("");

  const [deadlineTab, setDeadlineTab] = useState<"mine" | "all">("mine");
  const [mineEvents, setMineEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Student";
  const firstName = getFirstName(displayName);
  const greeting = getGreeting(firstName);

  // Load progress stats (streak)
  useEffect(() => {
    if (!user) return;
    const loadProgressStats = async () => {
      const { data: activityData } = await supabase
        .from("activity_log")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (activityData) {
        const dates = new Set(activityData.map(a => format(new Date(a.created_at), "yyyy-MM-dd")));
        let currentStreak = 0;
        const today = format(new Date(), "yyyy-MM-dd");
        const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

        let checkDate = new Date();
        if (dates.has(today)) {
          currentStreak = 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (dates.has(yesterday)) {
          currentStreak = 1;
          checkDate = new Date(Date.now() - 86400000);
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (currentStreak > 0 && dates.has(format(checkDate, "yyyy-MM-dd"))) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
        setStreak(currentStreak);
      }
    };
    loadProgressStats();
  }, [user]);

  // Load recent activity (last 4)
  useEffect(() => {
    if (!user) return;
    const loadRecentActivity = async () => {
      setActivityLoading(true);
      const { data } = await supabase
        .from("activity_log")
        .select("id, action, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4);
      setRecentActivity(data || []);
      setActivityLoading(false);
    };
    loadRecentActivity();
  }, [user]);

  // Load Events
  useEffect(() => {
    if (!user) return;
    const loadEvents = async () => {
      setEventsLoading(true);
      const { data: mine } = await supabase
        .from("campus_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(3);
        
      const { data: all } = await supabase
        .from("campus_events")
        .select("*, profiles!user_id(display_name)")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(3);

      setMineEvents(mine || []);
      setAllEvents(all || []);
      setEventsLoading(false);
    };
    loadEvents();
  }, [user]);

  const quickActions = [
    { label: "New Note", icon: <NotebookPen className="h-5 w-5" />, path: "/notes" },
    { label: "Ask Oracle", icon: <Sparkles className="h-5 w-5" />, path: "/ai-oracle" },
    { label: "Upload File", icon: <Upload className="h-5 w-5" />, path: "/vault" },
    { label: "GPA Calc", icon: <GraduationCap className="h-5 w-5" />, path: "/gpa" },
    { label: "Add Deadline", icon: <CalendarPlus className="h-5 w-5" />, path: "/calendar" },
  ];

  const displayedEvents = deadlineTab === "mine" ? mineEvents : allEvents;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* 1. GREETING */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {greeting}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Currently in <span className="text-primary font-medium">{activeCommunity === "informatics" ? "Informatics Faculty" : activeCommunity === "mathematics" ? "Mathematics Faculty" : "Your Personal Workspace"}</span>
        </p>
      </motion.div>

      {/* 2. QUICK ACTIONS */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {quickActions.map(action => (
          <button key={action.label} onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-2 p-4 bg-card border border-border/40 rounded-2xl hover:border-primary/30 hover:bg-primary/5 transition-all group">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
              {action.icon}
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* 3. TWO COLUMN LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 space-y-6">
          
          {/* Upcoming Deadlines */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight">Upcoming</h2>
              </div>
              <div className="flex bg-muted/30 p-1 rounded-lg">
                <button
                  onClick={() => setDeadlineTab("mine")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${deadlineTab === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Mine
                </button>
                <button
                  onClick={() => setDeadlineTab("all")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${deadlineTab === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  All
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {eventsLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              ) : displayedEvents.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground bg-muted/10 rounded-xl border border-border/40 border-dashed">
                  <p className="text-sm">No upcoming deadlines.</p>
                  <button onClick={() => navigate("/calendar")} className="text-primary text-xs mt-1 hover:underline">Add one →</button>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {displayedEvents.map((evt) => (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3 bg-card border border-border/40 rounded-xl hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => navigate("/calendar")}
                    >
                      <div>
                        <p className="text-sm font-semibold">{evt.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(evt.start_time), "MMM d, h:mm a")}
                          </p>
                          {deadlineTab === "all" && evt.profiles?.display_name && (
                            <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 rounded-sm">
                              by {getFirstName(evt.profiles?.display_name)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                          {differenceInCalendarDays(new Date(evt.start_time), new Date()) === 0 
                            ? "Today" 
                            : `in ${differenceInCalendarDays(new Date(evt.start_time), new Date())}d`}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Recent Activity</h2>
            {activityLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                      <span className="text-base">{ACTION_ICONS[item.action] || "📌"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ACTION_LABELS[item.action] || item.action}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(item.created_at))} ago</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          
          {/* Streak Card */}
          <div 
            className="flex items-center gap-4 bg-card border border-border/40 rounded-2xl p-5 hover:border-primary/40 transition-all cursor-pointer shadow-sm"
            onClick={() => navigate("/progress")}
          >
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl ${streak > 0 ? "bg-orange-500/10" : "bg-muted/30"}`}>
              {streak > 0 ? "🔥" : "💤"}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-0.5">Current Streak</p>
              <p className="text-xl font-black leading-none">{streak > 0 ? `${streak} Days` : "0 Days"}</p>
              <p className="text-[10px] text-primary mt-1">{streak > 0 ? "You're on fire!" : "Start today!"}</p>
            </div>
          </div>

          {/* AI Oracle Quick-Ask */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <Sparkles className="h-16 w-16" />
            </div>
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div className="h-6 w-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <span className="font-semibold text-sm">Quick Ask</span>
            </div>
            <div className="flex gap-2 relative z-10">
              <Input
                placeholder="Ask Oracle anything..."
                value={quickAsk}
                onChange={e => setQuickAsk(e.target.value)}
                onKeyDown={e => e.key === "Enter" && navigate("/ai-oracle", { state: { prefillMessage: quickAsk } })}
                className="h-9 text-sm bg-background/50 border-border/50 focus-visible:ring-indigo-500/30"
              />
              <Button size="sm" className="h-9 px-3 bg-indigo-500 hover:bg-indigo-600 text-white" onClick={() => navigate("/ai-oracle", { state: { prefillMessage: quickAsk } })}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
