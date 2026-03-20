import { useState, useEffect } from "react";
import { ArrowRight, NotebookPen, Sparkles, Upload, CalendarPlus, CalendarDays, GraduationCap, Clock, FileText, Globe } from "lucide-react";
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

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getGreeting(firstName: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return `Good morning, ${firstName} ☀️`;
  if (hour >= 12 && hour <= 17) return `Good afternoon, ${firstName} 👋`;
  if (hour >= 18 && hour <= 23) return `Good evening, ${firstName} 🌙`;
  return `Still up, ${firstName}? 🦉`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { activeCommunity } = useApp();
  const navigate = useNavigate();
  
  const [streak, setStreak] = useState(0);
  const [quickAsk, setQuickAsk] = useState("");

  const [mineEvents, setMineEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);

  const [communityPulse, setCommunityPulse] = useState<any[]>([]);
  const [pulseLoading, setPulseLoading] = useState(true);

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

  // Load Events (mine only, max 3)
  useEffect(() => {
    if (!user) return;
    const loadEvents = async () => {
      setEventsLoading(true);
      const { data } = await supabase
        .from("campus_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(3);
      setMineEvents(data || []);
      setEventsLoading(false);
    };
    loadEvents();
  }, [user]);

  // Load Recent Files (max 3)
  useEffect(() => {
    if (!user) return;
    const loadFiles = async () => {
      setFilesLoading(true);
      const { data } = await supabase
        .from("vault_files")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      setRecentFiles(data || []);
      setFilesLoading(false);
    };
    loadFiles();
  }, [user]);

  // Load Community Pulse (activity_feed, max 3)
  useEffect(() => {
    if (!user) return;
    const loadPulse = async () => {
      setPulseLoading(true);
      // We assume profiles relation exists. Use raw user lookup or rely on display_name if activity_feed has it.
      // Assuming activity_feed doesn't join easily without profiles, we fetch data and join client-side if needed,
      // but if we look at `feed.ts` it might not have display_name. Wait, `profiles(display_name)` works in supabase.
      const { data } = await supabase
        .from("activity_feed")
        .select("*, profiles(display_name)")
        .order("created_at", { ascending: false })
        .limit(3);
      setCommunityPulse(data || []);
      setPulseLoading(false);
    };
    loadPulse();
  }, [user]);

  const quickActions = [
    { label: "New Note", icon: <NotebookPen className="h-5 w-5" />, path: "/notes" },
    { label: "Ask Oracle", icon: <Sparkles className="h-5 w-5" />, path: "/ai-oracle" },
    { label: "Upload File", icon: <Upload className="h-5 w-5" />, path: "/vault" },
    { label: "GPA Calc", icon: <GraduationCap className="h-5 w-5" />, path: "/gpa" },
    { label: "Add Deadline", icon: <CalendarPlus className="h-5 w-5" />, path: "/calendar" },
  ];

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
        className="grid grid-cols-2 lg:grid-cols-5 gap-3"
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
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Upcoming Deadlines
            </h2>

            <div className="space-y-3">
              {eventsLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              ) : mineEvents.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground bg-muted/20 rounded-xl border border-border/40 border-dashed">
                  <p className="text-sm font-medium">No deadlines.</p>
                  <button onClick={() => navigate("/calendar")} className="text-primary text-xs mt-1 hover:underline font-semibold">Add one in Calendar →</button>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {mineEvents.map((evt) => (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3.5 bg-background border border-border/50 rounded-xl hover:border-primary/40 transition-all cursor-pointer"
                      onClick={() => navigate("/calendar")}
                    >
                      <div>
                        <p className="text-sm font-bold">{evt.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(evt.start_time), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold tracking-wide uppercase bg-primary/10 text-primary px-2 py-1 rounded-md">
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
          </div>

          {/* Recent Files */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Recently Added to Vault
              </h2>
              <button onClick={() => navigate("/vault")} className="text-xs font-semibold text-primary hover:underline">
                View all →
              </button>
            </div>
            <div className="space-y-3">
              {filesLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              ) : recentFiles.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground bg-muted/20 rounded-xl border border-border/40 border-dashed">
                  <p className="text-sm">No files in the vault yet.</p>
                </div>
              ) : (
                recentFiles.map(file => (
                  <div key={file.id} onClick={() => navigate("/vault")} className="flex items-center justify-between p-3.5 bg-background border border-border/50 rounded-xl hover:border-blue-500/30 transition-all cursor-pointer">
                     <div className="flex items-center gap-3 overflow-hidden">
                       <div className="h-10 w-10 shrink-0 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                         {file.file_type === "Lectures" ? "📖" : file.file_type === "Practices" ? "💡" : file.file_type === "Homeworks" ? "📋" : file.file_type === "Exams" ? "📝" : "📄"}
                       </div>
                       <div className="min-w-0">
                         <p className="text-sm font-bold truncate">{file.name}</p>
                         <p className="text-[11px] text-muted-foreground font-medium truncate">{file.subject}</p>
                       </div>
                     </div>
                     <p className="text-[10px] text-muted-foreground shrink-0 pl-2">
                        {formatDistanceToNow(new Date(file.created_at))} ago
                     </p>
                  </div>
                ))
              )}
            </div>
          </div>

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
              <p className="text-sm font-semibold text-muted-foreground mb-0.5">Current Streak</p>
              <p className="text-2xl font-black leading-none">{streak > 0 ? `${streak} Days` : "0 Days"}</p>
            </div>
          </div>

          {/* AI Oracle Quick-Ask */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <Sparkles className="h-16 w-16" />
            </div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-indigo-500" />
              </div>
              <span className="font-bold">Ask Oracle</span>
            </div>
            <div className="flex gap-2 relative z-10">
              <Input
                placeholder="Ask anything..."
                value={quickAsk}
                onChange={e => setQuickAsk(e.target.value)}
                onKeyDown={e => e.key === "Enter" && navigate("/ai-oracle", { state: { prefillMessage: quickAsk } })}
                className="h-10 text-sm bg-background/50 border-border/50 focus-visible:ring-indigo-500/30"
              />
              <Button className="h-10 px-3 bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm" onClick={() => navigate("/ai-oracle", { state: { prefillMessage: quickAsk } })}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Community Pulse */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Community
              </h2>
              <button onClick={() => navigate("/community")} className="text-xs font-semibold text-primary hover:underline">
                View →
              </button>
            </div>
            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border/50 before:to-transparent">
              {pulseLoading ? (
                [1, 2, 3].map(i => <div key={i} className="flex gap-3 relative z-10"><Skeleton className="h-8 w-8 rounded-full shrink-0"/><Skeleton className="h-10 w-full rounded-md"/></div>)
              ) : communityPulse.length === 0 ? (
                <div className="text-sm text-center py-4 text-muted-foreground relative z-10">Quiet today...</div>
              ) : (
                communityPulse.map(item => {
                  const dName = item.profiles?.display_name || "Someone";
                  return (
                    <div key={item.id} className="flex items-start gap-3 relative z-10">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {getInitials(dName)}
                      </div>
                      <div className="flex-1 min-w-0 bg-background border border-border/50 rounded-xl p-2.5">
                        <p className="text-xs leading-snug">
                          <span className="font-bold">{dName}</span>
                          <span className="text-muted-foreground"> {item.action_type === 'file_uploaded' ? "uploaded" : item.action_type === 'note_saved' ? "published" : "shared"} </span>
                          <span className="font-medium text-foreground">{item.entity_title}</span>
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-1 font-medium">{formatDistanceToNow(new Date(item.created_at))} ago</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
