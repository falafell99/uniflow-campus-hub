import { RetroWindow } from "@/components/RetroWindow";
import { useState, useEffect } from "react";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Sparkles, Upload, NotebookPen, Layers, 
  ArrowRight, CheckSquare, Check, CalendarDays 
} from "lucide-react";

export default function Today() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [mostUrgent, setMostUrgent] = useState<any>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 22 ? "Good evening" : "Still up";
  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "Student";

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const nowUtc = new Date().toISOString();

      const [tasksRes, deadlinesRes, streakRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .neq("status", "done")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(5),
        supabase
          .from("campus_events")
          .select("*")
          .eq("user_id", user.id)
          .gte("start_time", nowUtc)
          .order("start_time")
          .limit(3),
        supabase
          .from("activity_log")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", thirtyDaysAgo)
      ]);

      const tasks = tasksRes.data || [];
      const deadlines = deadlinesRes.data || [];
      const activityDays = new Set((streakRes.data || []).map(log => log.created_at.split('T')[0]));
      
      setTodayTasks(tasks);
      setUpcomingDeadlines(deadlines);
      
      // Calculate simple streak (very basic version)
      let currentStreak = 0;
      let d = new Date();
      while (activityDays.has(d.toISOString().split('T')[0])) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
      setStreak(currentStreak);

      // Determine most urgent
      let urgent = null;
      if (deadlines.length > 0 && tasks.length > 0) {
        const firstDeadlineTime = new Date(deadlines[0].start_time).getTime();
        const firstTaskTime = tasks[0].due_date ? new Date(tasks[0].due_date).getTime() : Infinity;
        if (firstDeadlineTime < firstTaskTime && differenceInDays(firstDeadlineTime, new Date()) <= 3) {
          urgent = { type: "deadline", title: deadlines[0].title, date: deadlines[0].start_time, link: "/calendar" };
        } else {
          urgent = { type: "task", title: tasks[0].title, date: tasks[0].due_date, link: "/tasks" };
        }
      } else if (deadlines.length > 0 && differenceInDays(new Date(deadlines[0].start_time), new Date()) <= 3) {
        urgent = { type: "deadline", title: deadlines[0].title, date: deadlines[0].start_time, link: "/calendar" };
      } else if (tasks.length > 0) {
        urgent = { type: "task", title: tasks[0].title, date: tasks[0].due_date, link: "/tasks" };
      }
      setMostUrgent(urgent);
    };

    fetchData();
  }, [user]);

  const toggleTask = async (task: any) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t).filter(t => t.status !== "done"));
    await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-6 pb-24 h-full overflow-y-auto custom-scroll">
      
      <div className="mb-6">
        <h1 className="text-3xl font-black desktop-label">{greeting}, {firstName} 👋</h1>
        <p className="desktop-label-muted mt-1 text-sm font-semibold">
          {format(new Date(), "EEEE, MMMM d")} · {todayTasks.length} tasks pending
        </p>
      </div>

      <RetroWindow title="Focus for Today" noButtons className="mb-5" bodyClassName="p-5">
        {mostUrgent ? (
          <div>
            <p className="font-bold text-lg leading-snug">{mostUrgent.title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {mostUrgent.type === "deadline" ? "⏰" : "📋"} {mostUrgent.date ? formatDistanceToNow(new Date(mostUrgent.date), { addSuffix: true }) : "No due date"}
            </p>
            <Button size="sm" className="mt-3 gap-2 shadow-sm font-semibold" onClick={() => navigate(mostUrgent.link)}>
              Work on this <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm font-medium">Nothing urgent today — great job! 🎉</p>
        )}
      </RetroWindow>

      <RetroWindow title="Quick Actions" noButtons className="mb-5" bodyClassName="p-3">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Ask Oracle", sub: "Get help with anything", icon: Sparkles, path: "/ai-oracle" },
          { label: "Upload File", sub: "Add to your Vault", icon: Upload, path: "/vault" },
          { label: "New Note", sub: "Write something down", icon: NotebookPen, path: "/notes" },
          { label: "Study Cards", sub: "Review flashcards", icon: Layers, path: "/flashcards" },
        ].map(action => (
          <button key={action.path} onClick={() => navigate(action.path)}
            className="retro-btn flex flex-col items-start gap-2 p-3 text-left">
            <div className="retro-bevel-in h-9 w-9 flex items-center justify-center shrink-0 text-[#000080]">
              <action.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-[13px] leading-tight">{action.label}</p>
              <p className="text-[10px] text-[#444] leading-tight mt-0.5">{action.sub}</p>
            </div>
          </button>
        ))}
      </div>
      </RetroWindow>

      <RetroWindow title="Today's Tasks" noButtons className="mb-4"
        actions={<button onClick={() => navigate("/tasks")} className="text-[10px] font-pixel font-bold text-white hover:underline mr-1">View all →</button>}>
        <div className="border-b border-border/20" />
        {todayTasks.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground font-medium">No tasks for today 🎉</p>
            <button onClick={() => navigate("/tasks")} className="text-xs font-semibold text-primary hover:underline mt-2 block mx-auto">Add a task →</button>
          </div>
        ) : todayTasks.slice(0, 5).map(task => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-0 hover:bg-muted/5 transition-colors">
            <button onClick={() => toggleTask(task)}
              className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                task.status === "done" ? "border-green-500 bg-green-500" : "border-border hover:border-primary"
              }`}>
              {task.status === "done" && <Check className="h-3 w-3 text-white" />}
            </button>
            <span className={`text-sm font-medium flex-1 truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </span>
            {task.subject && <Badge variant="outline" className="text-[10px] h-5 shrink-0 bg-background">{task.subject}</Badge>}
          </div>
        ))}
      </RetroWindow>

      <RetroWindow title="Upcoming Deadlines" noButtons className="mb-4"
        actions={<button onClick={() => navigate("/calendar")} className="text-[10px] font-pixel font-bold text-white hover:underline mr-1">Calendar →</button>}>
        <div className="border-b border-border/20" />
        {upcomingDeadlines.map(event => {
          const daysLeft = Math.max(0, differenceInDays(new Date(event.start_time), new Date()));
          return (
            <div key={event.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-0 hover:bg-muted/5 transition-colors">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                daysLeft === 0 ? "bg-red-500/10 text-red-500" :
                daysLeft <= 3 ? "bg-orange-500/10 text-orange-500" :
                "bg-muted/50 text-muted-foreground"
              }`}>
                {daysLeft === 0 ? "!" : `${daysLeft}d`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{event.title}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{format(new Date(event.start_time), "MMM d, h:mm a")}</p>
              </div>
            </div>
          );
        })}
        {upcomingDeadlines.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground font-medium">No upcoming deadlines</p>
            <button onClick={() => navigate("/calendar")} className="text-xs font-semibold text-primary hover:underline mt-2 block mx-auto">Add one →</button>
          </div>
        )}
      </RetroWindow>

      <RetroWindow title="Streak" noButtons bodyClassName="p-0">
      <div className="flex items-center gap-3 p-4">
        <span className="text-3xl drop-shadow-sm">{streak > 0 ? "🔥" : "💤"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-base">{streak} day streak</p>
          <p className="text-xs text-muted-foreground font-medium truncate">Keep it going — do something today</p>
        </div>
        <button onClick={() => navigate("/progress")} className="text-xs font-semibold text-primary hover:underline shrink-0">Stats →</button>
      </div>
      </RetroWindow>

    </div>
  );
}
