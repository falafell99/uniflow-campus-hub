import { useState, useEffect, useMemo } from "react";
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay } from "date-fns";
import {
  TrendingUp, FileText, Upload, CheckSquare, Sparkles, Loader2, Download
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

type Period = "This Week" | "This Month" | "All Time";

type ActivityRow = {
  created_at: string;
  action: string;
  subject: string | null;
};

export default function Progress() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("This Week");
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [allTimeActivities, setAllTimeActivities] = useState<ActivityRow[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch all for heatmap & streak regardless of period, 
    // And filtered for stats/subject breakdowns
    const fetchProgress = async () => {
      setLoading(true);
      
      const now = new Date();
      let startDateStr = new Date(0).toISOString(); // all time
      
      if (period === "This Week") {
        startDateStr = startOfDay(subDays(now, 7)).toISOString();
      } else if (period === "This Month") {
        startDateStr = startOfDay(subDays(now, 30)).toISOString();
      }

      // 1. Fetch filtered activities for the stats & breakdown
      const { data: periodData } = await supabase
        .from("activity_log")
        .select("created_at, action, subject")
        .eq("user_id", user.id)
        .gte("created_at", startDateStr)
        .order("created_at", { ascending: false });

      if (periodData) setActivities(periodData);

      // 2. Fetch all-time activities for heatmap and streaks
      // We limit to 365 days ago for the heatmap, but use it for streaks too
      const oneYearAgoStr = startOfDay(subDays(now, 365)).toISOString();
      const { data: allData } = await supabase
        .from("activity_log")
        .select("created_at, action, subject")
        .eq("user_id", user.id)
        .gte("created_at", oneYearAgoStr)
        .order("created_at", { ascending: false });

      if (allData) setAllTimeActivities(allData);
      
      setLoading(false);
    };

    fetchProgress();
  }, [user, period]);

  // --- STATS CALCULATION ---
  const notesSaved = activities.filter(a => a.action === "note_saved").length;
  const filesUploaded = activities.filter(a => a.action === "file_uploaded").length;
  const tasksCompleted = activities.filter(a => a.action === "task_completed").length;
  const oracleQueries = activities.filter(a => a.action === "oracle_query").length;

  // --- CHART DATA (Last 7 days strictly for the chart) ---
  const weekData = useMemo(() => {
    const today = new Date();
    const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
    return last7Days.map(day => {
      const matchCount = allTimeActivities.filter(a => isSameDay(new Date(a.created_at), day)).length;
      return {
        day: format(day, "EEE"),
        count: matchCount
      };
    });
  }, [allTimeActivities]);

  // --- HEATMAP (365 days grid) ---
  const heatmapData = useMemo(() => {
    const today = new Date();
    const last365Days = eachDayOfInterval({ start: subDays(today, 363), end: today }); // 364 days = 52 weeks * 7 days
    
    const counts: Record<string, number> = {};
    allTimeActivities.forEach(a => {
      const d = format(new Date(a.created_at), "yyyy-MM-dd");
      counts[d] = (counts[d] || 0) + 1;
    });

    return last365Days.map(day => {
      const dStr = format(day, "yyyy-MM-dd");
      return {
        dateStr: dStr,
        labelTitle: `${dStr}: ${counts[dStr] || 0} activities`,
        count: counts[dStr] || 0
      };
    });
  }, [allTimeActivities]);

  const getColor = (count: number) => {
    if (count === 0) return "var(--color-muted, rgba(128,128,128,0.15))";
    if (count === 1) return "rgba(123,104,238, 0.25)";   // primary based
    if (count >= 2 && count <= 3) return "rgba(123,104,238, 0.5)";
    if (count >= 4 && count <= 6) return "rgba(123,104,238, 0.75)";
    return "rgb(123,104,238)"; // 7+
  };

  // --- STREAKS ---
  const { currentStreak, bestStreak } = useMemo(() => {
    // Unique active days in descending order
    const activeDates = Array.from(new Set(allTimeActivities.map(a => format(new Date(a.created_at), "yyyy-MM-dd")))).sort((a, b) => b.localeCompare(a));
    
    if (activeDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
    
    let current = 0;
    let isCurrentActive = false;
    
    // Check if streak is alive
    if (activeDates[0] === todayStr || activeDates[0] === yesterdayStr) {
      isCurrentActive = true;
      current = 1;
      let checkDate = activeDates[0];
      for (let i = 1; i < activeDates.length; i++) {
        const expectedPrev = format(subDays(new Date(checkDate), 1), "yyyy-MM-dd");
        if (activeDates[i] === expectedPrev) {
          current++;
          checkDate = expectedPrev;
        } else {
          break;
        }
      }
    }

    // Calculate best overall streak
    let best = 0;
    let tempStreak = 1;
    for (let i = 0; i < activeDates.length - 1; i++) {
      const currentD = activeDates[i];
      const nextD = activeDates[i+1];
      const expectedNext = format(subDays(new Date(currentD), 1), "yyyy-MM-dd");
      
      if (nextD === expectedNext) {
        tempStreak++;
      } else {
        best = Math.max(best, tempStreak);
        tempStreak = 1;
      }
    }
    best = Math.max(best, tempStreak); // finalize last loop

    return { currentStreak: isCurrentActive ? current : 0, bestStreak: best };
  }, [allTimeActivities]);

  // --- SUBJECT BREAKDOWN ---
  const topSubjects = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach(a => {
      if (a.subject) counts[a.subject] = (counts[a.subject] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = sorted.length > 0 ? sorted[0][1] : 1; // avoid division by 0
    return sorted.map(([name, count]) => ({ name, count, ratio: (count / max) * 100 }));
  }, [activities]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Track your learning journey.</p>
          <p className="text-muted-foreground text-sm mt-1">Track your study streak, activity, and subject breakdown over time.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            import("@/lib/exportPDF").then(({ exportToPDF }) => {
              const reportHTML = `
                <h1>UniFlow Progress Report</h1>
                <div class="meta">Generated on ${new Date().toLocaleDateString()}</div>
                <h2>Stats</h2>
                <ul>
                  <li>Current streak: ${currentStreak} days</li>
                  <li>Best streak: ${bestStreak} days</li>
                  <li>Notes saved: ${notesSaved}</li>
                  <li>Files uploaded: ${filesUploaded}</li>
                  <li>Tasks completed: ${tasksCompleted}</li>
                  <li>Oracle queries: ${oracleQueries}</li>
                </ul>
                <h2>Most Active Subjects</h2>
                <ul>
                  ${topSubjects.map(s => `<li>${s.name}: ${s.count} activities</li>`).join("")}
                </ul>
              `;
              exportToPDF("UniFlow Progress Report", reportHTML);
            });
          }}>
            <Download className="h-3.5 w-3.5" /> Export Report
          </Button>
          <div className="flex bg-muted/30 p-1 rounded-xl">
            {(["This Week", "This Month", "All Time"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === p 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && activities.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <FileText className="h-6 w-6 text-blue-400" />
                <span className="text-2xl font-black">{notesSaved}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Notes saved</p>
            </div>
            <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <Upload className="h-6 w-6 text-green-400" />
                <span className="text-2xl font-black">{filesUploaded}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Files uploaded</p>
            </div>
            <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <CheckSquare className="h-6 w-6 text-purple-400" />
                <span className="text-2xl font-black">{tasksCompleted}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tasks completed</p>
            </div>
            <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="text-2xl font-black">{oracleQueries}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Oracle queries</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Heatmap */}
              <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm overflow-hidden">
                <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Activity this year
                </h3>
                <div className="overflow-x-auto pb-4 custom-scroll">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(52, minmax(10px, 1fr))', gap: '3px', minWidth: '700px' }}>
                    {/* The array length should ideally be perfect multiple of 7 */}
                    {heatmapData.map((day) => (
                      <div
                        key={day.dateStr}
                        title={day.labelTitle}
                        className="rounded-sm aspect-square transition-all hover:scale-110 hover:ring-2 ring-primary/30"
                        style={{ background: getColor(day.count) }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-2">
                  <span className="text-[10px] text-muted-foreground mr-1">Less</span>
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: getColor(0) }} />
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: getColor(1) }} />
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: getColor(2) }} />
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: getColor(5) }} />
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: getColor(8) }} />
                  <span className="text-[10px] text-muted-foreground ml-1">More</span>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold mb-6">This week's activity</h3>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                      <Tooltip 
                        contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="count" fill="#7b68ee" radius={[4,4,0,0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Streak Card */}
              <div className="bg-card border border-border/40 rounded-2xl p-6 flex items-center gap-5 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                <span className="text-5xl drop-shadow-md z-10">{currentStreak > 0 ? "🔥" : "💤"}</span>
                <div className="z-10">
                  <p className="text-3xl font-black mb-0.5">{currentStreak} day{currentStreak !== 1 ? "s" : ""}</p>
                  <p className="text-sm text-muted-foreground font-medium">Current streak · Best: {bestStreak} days</p>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm min-h-[300px]">
                <h3 className="text-sm font-semibold mb-4">Focus Areas ({period})</h3>
                {topSubjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mb-3 opacity-20" />
                    <p className="text-sm">No subject data found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topSubjects.map((sub) => (
                      <div key={sub.name} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-28 truncate shrink-0" title={sub.name}>{sub.name}</span>
                        <div className="flex-1 bg-muted/30 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-primary rounded-full h-full transition-all duration-1000 ease-out" 
                            style={{ width: `${sub.ratio}%` }} 
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right font-medium">{sub.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
