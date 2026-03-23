import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus, Clock, Search, Filter, Trash2, Loader2,
  CalendarPlus, X, GripVertical, Download, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isToday, isPast, parseISO } from "date-fns";
import { HintBubble } from "@/components/HintBubble";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { logActivity } from "@/lib/activity";
import { StudyCoach } from "@/components/StudyCoach";

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = "low" | "normal" | "high" | "urgent";
type Status = "todo" | "in_progress" | "review" | "done";

type Task = {
  id: string;
  user_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  subject: string | null;
  due_date: string | null;
  assignee_id: string | null;
  assignee_profile?: { display_name: string } | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type TeamOption = { id: string; name: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMN_STYLES: Record<Status, { label: string; color: string; light: string }> = {
  todo: { label: "To Do", color: "bg-slate-400", light: "bg-slate-500/10" },
  in_progress: { label: "In Progress", color: "bg-amber-400", light: "bg-amber-500/10" },
  review: { label: "In Review", color: "bg-purple-400", light: "bg-purple-500/10" },
  done: { label: "Done", color: "bg-green-400", light: "bg-green-500/10" },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "bg-red-500", high: "bg-orange-400", normal: "bg-muted-foreground/40", low: "bg-blue-400",
};
const PRIORITY_LABELS: Priority[] = ["low", "normal", "high", "urgent"];

type FilterKey = "mine" | "today" | "high" | "overdue";

// ─── Sortable Task Card ───────────────────────────────────────────────────────
function SortableTaskCard({ task, onClick, onComplete }: { task: Task; onClick: () => void; onComplete?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const dueDateColor = task.due_date
    ? isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
      ? "text-red-400"
      : isToday(parseISO(task.due_date))
        ? "text-orange-400"
        : "text-muted-foreground"
    : "";

  return (
    <div ref={setNodeRef} style={style}
      className="relative bg-card border border-border/40 rounded-xl p-4 md:p-3 space-y-2 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20 hover:border-primary/30 group"
      onClick={onClick}>
      
      {task.status !== "done" && onComplete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onComplete(); }}
          className="absolute bottom-3 right-3 h-6 w-6 rounded-md bg-muted hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-border/40 hover:border-emerald-500/40 z-10"
          title="Mark as Done"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <div {...attributes} {...listeners} className="pt-1 cursor-grab opacity-0 group-hover:opacity-60 transition-opacity p-1 -ml-1">
            <GripVertical className="h-4 w-4 md:h-3 md:w-3 text-muted-foreground" />
          </div>
          <p className="text-base md:text-sm font-medium leading-snug">{task.title}</p>
        </div>
        <div className={`h-2 w-2 rounded-full shrink-0 mt-1 ${PRIORITY_COLORS[task.priority]}`} title={task.priority} />
      </div>
      {task.subject && <Badge variant="outline" className="text-[10px] h-5">{task.subject}</Badge>}
      {task.due_date && (
        <div className={`flex items-center gap-1 text-[11px] ${dueDateColor}`}>
          <Clock className="h-3 w-3" />
          {format(parseISO(task.due_date), "MMM d")}
        </div>
      )}
      {task.assignee_profile?.display_name && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="h-6 w-6 md:h-5 md:w-5 rounded-full bg-primary/10 text-primary text-[10px] md:text-[9px] font-bold flex items-center justify-center">
            {task.assignee_profile.display_name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs md:text-[11px] text-muted-foreground">{task.assignee_profile.display_name}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KanbanBoard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { prefillTitle?: string; prefillDue?: string } | null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"personal" | "team">("personal");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [mobileColumn, setMobileColumn] = useState<Status>("todo");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<Status>("todo");
  const [formPriority, setFormPriority] = useState<Priority>("normal");
  const [formSubject, setFormSubject] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formAssigneeId, setFormAssigneeId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeResults, setAssigneeResults] = useState<{ id: string; display_name: string }[]>([]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Prefill from Calendar ──
  useEffect(() => {
    if (prefill?.prefillTitle) {
      setFormTitle(prefill.prefillTitle);
      if (prefill.prefillDue) {
        try { setFormDueDate(format(parseISO(prefill.prefillDue), "yyyy-MM-dd")); } catch {}
      }
      setFormStatus("todo");
      setFormPriority("normal");
      setModalOpen(true);
      window.history.replaceState({}, "");
    }
  }, [prefill]);

  // ── Fetch teams ──
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("team_members")
        .select("team_id, teams(id, name)")
        .eq("user_id", user.id)
        .eq("status", "accepted");
      if (data) {
        const t = data
          .map((m: Record<string, unknown>) => Array.isArray(m.teams) ? m.teams[0] : m.teams)
          .filter(Boolean) as TeamOption[];
        setTeams(t);
      }
    };
    load();
  }, [user]);

  // ── Fetch upcoming deadlines ──
  useEffect(() => {
    if (!user) return;
    const fetchDeadlines = async () => {
      const { data } = await supabase
        .from("campus_events")
        .select("title, start_time")
        .eq("user_id", user.id)
        .eq("event_type", "deadline")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(3);
      setUpcomingDeadlines(data || []);
    };
    fetchDeadlines();
  }, [user]);

  // ── Fetch tasks ──
  const loadTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("tasks")
      .select("*, assignee_profile:profiles!assignee_id(display_name)")
      .order("created_at", { ascending: false });

    if (mode === "personal") {
      query = query.eq("user_id", user.id).is("team_id", null);
    } else if (selectedTeamId) {
      query = query.eq("team_id", selectedTeamId);
    } else {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data, error } = await query;
    if (error) toast.error("Failed to load tasks: " + error.message);
    else setTasks((data || []) as Task[]);
    setLoading(false);
  }, [user, mode, selectedTeamId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ── Real-time ──
  useEffect(() => {
    channelRef.current = supabase
      .channel("kanban-tasks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => { loadTasks(); })
      .subscribe();
    return () => { channelRef.current?.unsubscribe(); };
  }, [loadTasks]);

  // ── Unique subjects ──
  const subjects = [...new Set(tasks.map(t => t.subject).filter(Boolean) as string[])];

  // ── Client-side filter ──
  const filteredTasks = tasks.filter(t => {
    if (filters.has("mine") && t.assignee_id !== user?.id && t.user_id !== user?.id) return false;
    if (filters.has("today") && (!t.due_date || !isToday(parseISO(t.due_date)))) return false;
    if (filters.has("high") && t.priority !== "high" && t.priority !== "urgent") return false;
    if (filters.has("overdue") && (!t.due_date || !isPast(parseISO(t.due_date)) || isToday(parseISO(t.due_date)))) return false;
    if (subjectFilter && t.subject !== subjectFilter) return false;
    return true;
  });

  const columnTasks = (status: Status) => filteredTasks.filter(t => t.status === status);

  // ── Drag and drop ──
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column droppable
    const newStatus = (Object.keys(COLUMN_STYLES) as Status[]).find(s => s === overId);
    if (newStatus) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        const { error } = await supabase.from("tasks").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", taskId);
        if (error) { toast.error("Failed to update task"); loadTasks(); }
        else {
          toast.success(`Moved to ${COLUMN_STYLES[newStatus].label}`);
          if (newStatus === "done") {
            logActivity("task_completed", task.subject || undefined);
            if (task.due_date) await supabase.from("campus_events").delete().eq("id", `task-${taskId}`);
          } else if (task.due_date) {
            await supabase.from("campus_events").upsert({
              id: `task-${taskId}`,
              user_id: user?.id,
              title: `📋 ${task.title}`,
              description: `Task from Kanban${task.subject ? ` · ${task.subject}` : ""}`,
              event_type: "deadline",
              start_time: task.due_date,
              end_time: null
            }, { onConflict: "id" });
          }
        }
      }
    }
  };

  // ── Modal helpers ──
  const handleCompleteTask = async (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "done" } : t));
    const { error } = await supabase.from("tasks").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", task.id);
    if (error) { toast.error("Failed to execute"); loadTasks(); }
    else {
      toast.success("Task completed! 🎉");
      logActivity("task_completed", task.subject || undefined);
      if (task.due_date) await supabase.from("campus_events").delete().eq("id", `task-${task.id}`);
    }
  };

  const openCreate = (status: Status = "todo") => {
    setEditingTask(null);
    setFormTitle(""); setFormDesc(""); setFormStatus(status); setFormPriority("normal");
    setFormSubject(""); setFormDueDate(""); setFormAssigneeId(""); setFormNotes("");
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title); setFormDesc(task.description || "");
    setFormStatus(task.status); setFormPriority(task.priority);
    setFormSubject(task.subject || "");
    setFormDueDate(task.due_date ? format(parseISO(task.due_date), "yyyy-MM-dd") : "");
    setFormAssigneeId(task.assignee_id || ""); setFormNotes(task.notes || "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !user) return;
    setSaving(true);
    const payload = {
      title: formTitle.trim(),
      description: formDesc || null,
      status: formStatus,
      priority: formPriority,
      subject: formSubject || null,
      due_date: formDueDate || null,
      assignee_id: formAssigneeId || null,
      notes: formNotes || null,
      user_id: user.id,
      team_id: mode === "team" ? selectedTeamId : null,
      updated_at: new Date().toISOString(),
    };

    const taskId = editingTask ? editingTask.id : crypto.randomUUID();

    if (editingTask) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
      if (error) toast.error("Save failed: " + error.message);
      else {
        toast.success("Task updated!");
        if (payload.status === "done" && editingTask.status !== "done") logActivity("task_completed", payload.subject || undefined);
      }
    } else {
      const { error } = await supabase.from("tasks").insert({ ...payload, id: taskId });
      if (error) toast.error("Create failed: " + error.message);
      else {
        toast.success("Task created!");
        if (payload.status === "done") logActivity("task_completed", payload.subject || undefined);
      }
    }

    if (payload.due_date && payload.status !== "done") {
      await supabase.from("campus_events").upsert({
        id: `task-${taskId}`,
        user_id: user.id,
        title: `📋 ${payload.title}`,
        description: `Task from Kanban${payload.subject ? ` · ${payload.subject}` : ""}`,
        event_type: "deadline",
        start_time: payload.due_date,
        end_time: null
      }, { onConflict: "id" });
    } else {
      await supabase.from("campus_events").delete().eq("id", `task-${taskId}`);
    }

    setSaving(false);
    setModalOpen(false);
    loadTasks();
  };

  const handleDelete = async () => {
    if (!editingTask) return;
    const { error } = await supabase.from("tasks").delete().eq("id", editingTask.id);
    if (error) toast.error("Delete failed: " + error.message);
    else {
      toast.success("Task deleted");
      await supabase.from("campus_events").delete().eq("id", `task-${editingTask.id}`);
    }
    setModalOpen(false);
    loadTasks();
  };

  const addToCalendar = async () => {
    if (!editingTask?.due_date || !user) return;
    const { error } = await supabase.from("campus_events").insert({
      title: editingTask.title,
      event_type: "deadline",
      start_time: editingTask.due_date,
      end_time: editingTask.due_date,
      user_id: user.id,
    });
    if (error) toast.error("Failed to add to calendar");
    else toast.success("Added to calendar!");
  };

  // ── Assignee search ──
  useEffect(() => {
    if (!assigneeSearch.trim() || assigneeSearch.length < 2) { setAssigneeResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id, display_name").ilike("display_name", `%${assigneeSearch}%`).limit(5);
      if (data) setAssigneeResults(data as { id: string; display_name: string }[]);
    }, 300);
    return () => clearTimeout(t);
  }, [assigneeSearch]);

  const toggleFilter = (f: FilterKey) => setFilters(prev => { const n = new Set(prev); if (n.has(f)) n.delete(f); else n.add(f); return n; });

  // ── Render ──
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] pb-16 md:pb-0 overflow-hidden animate-fade-in relative">
      {/* Header */}
      <div className="p-4 border-b border-border/40 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">📋 Tasks</h1>
            <p className="text-muted-foreground mt-1 text-sm hidden md:block">Organize tasks and track assignments.</p>
            <p className="text-muted-foreground mt-1 text-sm hidden md:block">Manage your assignments and projects. Drag cards to update status.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex border border-border/40 rounded-lg overflow-hidden">
              {(["personal", "team"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {m === "personal" ? "Personal" : "Team"}
                </button>
              ))}
            </div>
            {mode === "team" && teams.length > 0 && (
              <Select value={selectedTeamId || "unselected"} onValueChange={v => setSelectedTeamId(v === "unselected" ? null : v)}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-transparent border-border/40">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unselected" className="text-muted-foreground">Select team...</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              import("@/lib/exportPDF").then(({ exportToPDF, tasksToHTML }) => {
                const title = selectedTeamId ? `Team Tasks` : "My Tasks";
                exportToPDF(title, tasksToHTML(filteredTasks, title));
              });
            }}>
              <Download className="h-3.5 w-3.5" /> Export PDF
            </Button>
            <Button className="gap-1.5" size="sm" onClick={() => openCreate()}><Plus className="h-3.5 w-3.5" /> New Task</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {([
            { key: "mine" as FilterKey, label: "My Tasks" },
            { key: "today" as FilterKey, label: "Due Today" },
            { key: "high" as FilterKey, label: "High Priority" },
            { key: "overdue" as FilterKey, label: "Overdue" },
          ]).map(f => (
            <button key={f.key} onClick={() => toggleFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                filters.has(f.key) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"
              }`}>
              {f.label}
            </button>
          ))}
          {subjects.length > 0 && (
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
              className="bg-transparent border border-border/40 rounded-full px-2 py-1 text-[10px] outline-none text-muted-foreground">
              <option value="" className="bg-[#1a1a1a]">All subjects</option>
              {subjects.map(s => <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>)}
            </select>
          )}
        </div>
      </div>

      {upcomingDeadlines && upcomingDeadlines.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2 border-b border-border/20 bg-orange-500/5 overflow-x-auto">
          <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />
          <span className="text-[11px] text-orange-400 font-medium shrink-0">Upcoming:</span>
          {upcomingDeadlines.map((d, i) => (
            <span key={i} className="text-[11px] text-muted-foreground shrink-0 bg-card border border-border/30 rounded-md px-2 py-0.5">
              {d.title} · {format(new Date(d.start_time), "MMM d")}
            </span>
          ))}
          <button onClick={() => navigate("/calendar")} className="text-[11px] text-primary hover:underline shrink-0 ml-auto">
            View Calendar →
          </button>
        </div>
      )}

      {/* Mobile Column Selector */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 mb-2 md:hidden hide-scrollbar scroll-smooth">
        {(Object.keys(COLUMN_STYLES) as Status[]).map(status => {
          const style = COLUMN_STYLES[status];
          const count = columnTasks(status).length;
          return (
            <button key={status} onClick={() => setMobileColumn(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex border ${
                mobileColumn === status ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/50"
              }`}>
              {style.label} <span className="ml-1.5 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 pt-0 md:pt-4 relative">
        <HintBubble
          id="kanban-drag"
          message="✋ Drag cards between columns to update their status"
          position="bottom"
          className="top-2 left-4"
        />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full md:min-w-max">
            {(Object.keys(COLUMN_STYLES) as Status[]).map(status => {
              const style = COLUMN_STYLES[status];
              const colTasks = columnTasks(status);
              
              return (
                <div key={status}
                  className={`min-w-full md:min-w-[280px] md:max-w-[320px] md:w-[300px] flex-col rounded-2xl border border-border/30 bg-card/20 overflow-hidden ${
                    mobileColumn === status ? "flex" : "hidden md:flex"
                  }`}>
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-4 py-3 ${style.light} border-b border-border/20`}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${style.color}`} />
                      <span className="font-semibold text-sm">{style.label}</span>
                      <span className="text-xs bg-background/50 px-2 py-0.5 rounded-full ml-1">{colTasks.length}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background/50 text-muted-foreground hover:text-foreground" onClick={() => openCreate(status)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Column body */}
                  <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy} id={status}>
                    <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-3">
                      {loading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <div key={i} className="h-24 rounded-xl glass-subtle animate-pulse" />
                        ))
                      ) : colTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 opacity-60 border-2 border-dashed border-border/30 rounded-xl m-2">
                          <p className="text-xs text-muted-foreground">Drop tasks here</p>
                          <button onClick={() => openCreate(status)} className="text-xs text-primary mt-1 hover:underline">
                            + Add task
                          </button>
                        </div>
                      ) : (
                        colTasks.map(task => (
                          <SortableTaskCard key={task.id} task={task} onClick={() => openEdit(task)} onComplete={() => handleCompleteTask(task)} />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) setModalOpen(false); }}>
        <DialogContent className="max-w-lg bg-[#1a1a1a] border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {editingTask ? "Edit Task" : "New Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Task title..." autoFocus className="text-base md:text-sm h-10" style={{ fontSize: "16px" }} />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description..." rows={2} className="text-base md:text-sm" style={{ fontSize: "16px" }} />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <div className="flex gap-1">
                {(Object.keys(COLUMN_STYLES) as Status[]).map(c => (
                  <button key={c} onClick={() => setFormStatus(c)}
                    className={`flex-1 py-1.5 rounded-lg text-xs border capitalize transition-all ${
                      formStatus === c ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"
                    }`}>
                    {COLUMN_STYLES[c].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <div className="flex gap-1">
                {PRIORITY_LABELS.map(p => (
                  <button key={p} onClick={() => setFormPriority(p)}
                    className={`flex-1 py-1.5 rounded-lg text-xs border capitalize transition-all flex items-center justify-center gap-1.5 ${
                      formPriority === p ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"
                    }`}>
                    <div className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[p]}`} />
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject + Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="e.g. Algorithms" list="task-subjects" className="text-base md:text-sm h-10" style={{ fontSize: "16px" }} />
                <datalist id="task-subjects">{subjects.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Due date</label>
                <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className="w-full bg-transparent border border-border/40 rounded-lg px-3 h-10 text-base md:text-sm outline-none focus:border-primary transition-colors" />
              </div>
            </div>

            {/* Assignee (team mode only) */}
            {mode === "team" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                <div className="relative">
                  <Input value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} placeholder="Search to assign..." className="text-base md:text-sm h-10" style={{ fontSize: "16px" }} />
                  {assigneeResults.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-full z-50 glass-card border border-border/60 rounded-lg shadow-xl py-1 max-h-40 overflow-y-auto">
                      {assigneeResults.map(p => (
                        <button key={p.id} className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted/50 transition-colors"
                          onClick={() => { setFormAssigneeId(p.id); setAssigneeSearch(p.display_name); setAssigneeResults([]); }}>
                          {p.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Task-specific notes..." rows={2} className="text-base md:text-sm" style={{ fontSize: "16px" }} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button className="flex-1 gap-1.5" onClick={handleSave} disabled={saving || !formTitle.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
              {editingTask && formDueDate && (
                <Button variant="outline" size="icon" className="shrink-0" title="Add to Calendar" onClick={addToCalendar}>
                  <CalendarPlus className="h-4 w-4" />
                </Button>
              )}
              {editingTask && (
                <Button variant="destructive" size="icon" className="shrink-0" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <StudyCoach page="tasks" />
    </div>
  );
}
