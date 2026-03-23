import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Folder, Plus, MoreHorizontal, LayoutList, Kanban, 
  CalendarDays, Filter, ChevronDown, CheckCircle2, 
  Circle, Clock, Search, Info, FileText, Bookmark, 
  FolderPlus, X, ChevronRight, Loader2, Trash2, Sparkles,
  Upload, PieChart, List, Table2, Map, Activity,
  BarChart2, Users, GanttChartSquare, AlignLeft, Pencil, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// --- Types ---
type TaskStatus = "todo" | "in-progress" | "review" | "done";

interface WorkspaceSpace {
  id: string;
  name: string;
  emoji?: string;
  user_id: string;
  created_at?: string;
}

interface WorkspaceTask {
  id: string;
  space_id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  due_date?: string;
  assignee?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case "done": return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "in-progress": return <Clock className="h-4 w-4 text-primary" />;
    case "review": return <Circle className="h-4 w-4 text-warning fill-warning/20" />;
    case "todo": return <Circle className="h-4 w-4 text-muted-foreground stroke-dashed" />;
    default: return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case "done": return "text-success bg-success/10 border-success/20";
    case "in-progress": return "text-primary bg-primary/10 border-primary/20";
    case "review": return "text-warning bg-warning/10 border-warning/20";
    default: return "text-muted-foreground bg-muted/50 border-border/40";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High": return "text-destructive bg-destructive/10 border-destructive/20";
    case "Medium": return "text-warning bg-warning/10 border-warning/20";
    default: return "text-muted-foreground bg-muted/50 border-border/40";
  }
};

export default function Workspace() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<WorkspaceSpace[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceEmoji, setNewSpaceEmoji] = useState("📂");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [targetSpaceId, setTargetSpaceId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<TaskStatus>("todo");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("Medium");
  const [newTaskDate, setNewTaskDate] = useState("");
  
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isViewPanelOpen, setIsViewPanelOpen] = useState(false);
  const [viewSearch, setViewSearch] = useState("");
  const [isDraggingOverResources, setIsDraggingOverResources] = useState(false);
  const [resourceFiles, setResourceFiles] = useState<{name: string; size: string}[]>([]);
  const viewPanelRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    // 1. Fetch Spaces
    const { data: spacesData, error: spacesError } = await supabase
      .from("workspace_spaces")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (spacesError) {
      console.error("Error fetching spaces:", spacesError);
    } else if (spacesData && spacesData.length > 0) {
      setSpaces(spacesData);
      setActiveCategory(spacesData[0].id);
    } else {
      // Create a default space if none exists
      const { data: defaultSpace, error: createError } = await supabase
        .from("workspace_spaces")
        .insert({ name: "Default Space", user_id: user.id })
        .select()
        .single();
      
      if (!createError && defaultSpace) {
        setSpaces([defaultSpace]);
        setActiveCategory(defaultSpace.id);
      }
    }

    // 2. Fetch Tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from("workspace_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
    } else if (tasksData) {
      setTasks(tasksData);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();

    // Set up real-time subscription
    if (!user) return;
    
    const spacesChannel = supabase
      .channel("workspace_spaces_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_spaces", filter: `user_id=eq.${user.id}` }, () => {
        fetchData();
      })
      .subscribe();

    const tasksChannel = supabase
      .channel("workspace_tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_tasks", filter: `user_id=eq.${user.id}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(spacesChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [user, fetchData]);

  const handleAddTask = async () => {
    if (!user || !newTaskTitle.trim() || !targetSpaceId) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("workspace_tasks")
        .insert({
          title: newTaskTitle,
          description: newTaskDescription,
          space_id: targetSpaceId,
          status: targetStatus,
          user_id: user.id,
          priority: newTaskPriority,
          due_date: newTaskDate || null,
          assignee: "You"
        });

      if (error) throw error;
      
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDate("");
      setIsTaskModalOpen(false);
      toast.success("Task added!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTaskModal = (spaceId: string, status: TaskStatus = "todo") => {
    setTargetSpaceId(spaceId);
    setTargetStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleApplyTemplate = async (template: { title: string; priority: string; description: string }) => {
    if (!user || !activeCategory) return;
    
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("workspace_tasks")
        .insert({
          title: template.title,
          description: template.description,
          space_id: activeCategory,
          status: "todo",
          user_id: user.id,
          priority: template.priority,
          assignee: "You"
        });

      if (error) throw error;
      toast.success(`Template '${template.title}' applied!`);
      setIsTemplateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    await supabase
      .from("workspace_tasks")
      .update({ status: newStatus })
      .eq("id", taskId);
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase
      .from("workspace_tasks")
      .delete()
      .eq("id", taskId);
  };

  const handleAddSpace = async () => {
    if (!user || !newSpaceName.trim()) return;

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from("workspace_spaces")
        .insert({ 
          name: newSpaceName, 
          emoji: newSpaceEmoji,
          user_id: user.id 
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Space created!");
      setIsSpaceModalOpen(false);
      setNewSpaceName("");
      if (data) setActiveCategory(data.id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameSpace = async (spaceId: string) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return;
    
    const newName = prompt("Enter new name for the space:", space.name);
    if (!newName || newName === space.name) return;

    try {
      const { error } = await supabase
        .from("workspace_spaces")
        .update({ name: newName })
        .eq("id", spaceId);

      if (error) throw error;
      toast.success("Space renamed");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm("Are you sure you want to delete this space and all its tasks?")) return;
    
    try {
      const { error } = await supabase
        .from("workspace_spaces")
        .delete()
        .eq("id", spaceId);

      if (error) throw error;
      toast.success("Space deleted");
      if (activeCategory === spaceId) {
        const remaining = spaces.filter(s => s.id !== spaceId);
        setActiveCategory(remaining[0]?.id || "");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSpace = t.space_id === activeCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpace && matchesSearch;
  });

  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5);
  const activeSpace = spaces.find(s => s.id === activeCategory);

  if (loading && spaces.length === 0) {
    return (
      <div className="flex h-[calc(100vh-6rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] w-full max-w-[1400px] mx-auto md:rounded-xl border-x md:border-y border-border/40 overflow-hidden bg-background">
      
      <div className="w-64 border-r border-border/40 bg-card/10 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-border/20 flex items-center justify-between">
          <span className="font-semibold text-sm">Spaces</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddSpace}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scroll">
            {spaces.map(cat => (
              <div key={cat.id} className="group relative">
                <button
                   onClick={() => setActiveCategory(cat.id)}
                   className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                     activeCategory === cat.id 
                       ? "bg-primary/10 text-primary font-medium" 
                       : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                   }`}
                >
                  <div className="flex items-center gap-2">
                     <div className={`h-5 w-5 rounded-md flex items-center justify-center transition-colors ${activeCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted group-hover:bg-muted-foreground/20 text-muted-foreground"}`}>
                        <span className="text-[10px] font-bold">{cat.emoji || "📂"}</span>
                     </div>
                    <span className="truncate max-w-[120px]">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 hover:bg-primary/10 hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameSpace(cat.id);
                      }}
                    >
                      <Plus className="h-3 w-3 rotate-45" /> {/* Using rotate-45 for a simple pencil-like look or just Edit */}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSpace(cat.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </button>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-border/20">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full h-8 text-xs border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5"
              onClick={() => setIsSpaceModalOpen(true)}
            >
              <Plus className="h-3 w-3 mr-2" /> Add Space
            </Button>
          </div>
        </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header Ribbon */}
        <div className="h-14 border-b border-border/20 flex flex-col px-4 shrink-0 bg-background/50 backdrop-blur-sm z-10 justify-center">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4 text-sm">
                 <div className="h-5 w-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                    <span className="text-[10px] font-bold">{activeSpace?.emoji || activeSpace?.name?.[0] || "S"}</span>
                 </div>
                 <span className="font-semibold">{activeSpace?.name || "Space"}</span>
                 <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="h-8 bg-transparent p-0 gap-1 hidden md:flex">
                  <TabsTrigger value="overview" className="h-8 px-3 text-xs data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">
                    <Info className="h-3.5 w-3.5 mr-1.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="list" className="h-8 px-3 text-xs data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">
                    <LayoutList className="h-3.5 w-3.5 mr-1.5" /> List
                  </TabsTrigger>
                  <TabsTrigger value="board" className="h-8 px-3 text-xs data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none">
                    <Kanban className="h-3.5 w-3.5 mr-1.5" /> Board
                  </TabsTrigger>
                  <div className="relative" ref={viewPanelRef}>
                    <Button
                      variant="ghost" size="sm"
                      className={`h-8 px-3 text-xs font-normal rounded-none ${isViewPanelOpen ? "text-primary" : "text-muted-foreground"}`}
                      onClick={() => setIsViewPanelOpen(v => !v)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> View
                    </Button>
                    {isViewPanelOpen && (
                      <div className="absolute top-full left-0 mt-1 w-[400px] bg-card border border-border/60 rounded-2xl shadow-2xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input className="w-full pl-9 h-9 bg-muted/20 border border-border/40 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Search views..." value={viewSearch} onChange={e => setViewSearch(e.target.value)} />
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Popular</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { icon: <List className="h-5 w-5" />, color: "bg-blue-600", label: "List", desc: "Track tasks, bugs, people & more" },
                              { icon: <GanttChartSquare className="h-5 w-5" />, color: "bg-red-500", label: "Gantt", desc: "Plan dependencies & time" },
                              { icon: <CalendarDays className="h-5 w-5" />, color: "bg-orange-500", label: "Calendar", desc: "Plan, schedule, & delegate" },
                              { icon: <AlignLeft className="h-5 w-5" />, color: "bg-blue-400", label: "Doc", desc: "Collaborate & document anything" },
                              { icon: <Kanban className="h-5 w-5" />, color: "bg-purple-600", label: "Board", desc: "Move tasks between columns" },
                              { icon: <FileText className="h-5 w-5" />, color: "bg-purple-400", label: "Form", desc: "Collect, track, & report data" },
                            ].filter(v => !viewSearch || v.label.toLowerCase().includes(viewSearch.toLowerCase())).map((v, i) => (
                              <button key={i} onClick={() => { if (v.label === "List") setActiveTab("list"); else if (v.label === "Board") setActiveTab("board"); else { toast.info(`${v.label} view coming soon!`); } setIsViewPanelOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl bg-muted/10 hover:bg-muted/20 border border-border/20 hover:border-primary/30 transition-all text-left">
                                <div className={`h-8 w-8 rounded-lg ${v.color} flex items-center justify-center text-white shrink-0`}>{v.icon}</div>
                                <div><p className="text-xs font-bold">{v.label}</p><p className="text-[10px] text-muted-foreground leading-tight">{v.desc}</p></div>
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">More views</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { icon: <Table2 className="h-5 w-5" />, color: "bg-green-600", label: "Table", desc: "Structured table format" },
                              { icon: <BarChart2 className="h-5 w-5" />, color: "bg-indigo-600", label: "Dashboard", desc: "Track metrics & insights" },
                              { icon: <Clock className="h-5 w-5" />, color: "bg-green-500", label: "Timeline", desc: "See tasks by start & due date" },
                              { icon: <Activity className="h-5 w-5" />, color: "bg-blue-500", label: "Activity", desc: "Real-time activity feed" },
                              { icon: <Users className="h-5 w-5" />, color: "bg-orange-600", label: "Workload", desc: "Visualize team capacity" },
                              { icon: <Pencil className="h-5 w-5" />, color: "bg-yellow-500", label: "Whiteboard", desc: "Visualize & brainstorm ideas" },
                              { icon: <Brain className="h-5 w-5" />, color: "bg-pink-500", label: "Mind Map", desc: "Visual brainstorming of ideas" },
                            ].filter(v => !viewSearch || v.label.toLowerCase().includes(viewSearch.toLowerCase())).map((v, i) => (
                              <button key={i} onClick={() => { toast.info(`${v.label} view coming soon!`); setIsViewPanelOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl bg-muted/10 hover:bg-muted/20 border border-border/20 hover:border-primary/30 transition-all text-left">
                                <div className={`h-8 w-8 rounded-lg ${v.color} flex items-center justify-center text-white shrink-0`}>{v.icon}</div>
                                <div><p className="text-xs font-bold">{v.label}</p><p className="text-[10px] text-muted-foreground leading-tight">{v.desc}</p></div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pt-2 border-t border-border/20 text-xs text-muted-foreground">
                          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="rounded" /> Private view</label>
                          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="rounded" /> Pin view</label>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center text-xs text-muted-foreground">
                 <Filter className="h-3.5 w-3.5 mr-1.5" /> Filter
              </div>
              <div className="relative hidden lg:flex">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search tasks..." 
                  className="h-8 w-40 pl-8 text-xs bg-muted/20 border-transparent rounded-full" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 rounded-md text-xs font-medium px-3 border-dashed border-border/40 hover:bg-muted/10 group" 
                  onClick={() => setIsTemplateModalOpen(true)}
                >
                  <Bookmark className="h-3 w-3 mr-1.5 text-muted-foreground group-hover:text-primary transition-colors" /> Templates
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 rounded-md text-xs font-medium px-4 shadow-lg shadow-primary/20" 
                  onClick={() => activeCategory && openTaskModal(activeCategory)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Task
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Views */}
        <div className="flex-1 overflow-auto custom-scroll">
          
          {/* ℹ️ OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="p-4 md:p-8 animate-in fade-in duration-300 max-w-5xl mx-auto space-y-6">
               {/* Banner */}
               <div className="flex items-center justify-center p-3 text-sm bg-muted/20 border border-border/40 rounded-lg text-muted-foreground relative">
                  <p>Get the most out of your Overview! Add, reorder, and resize cards to customize this page <a href="#" className="underline text-foreground">Get Started</a></p>
                  <X className="h-4 w-4 absolute right-4 cursor-pointer hover:text-foreground" />
               </div>

               <div className="flex items-center gap-4 justify-end text-xs text-muted-foreground">
                 <span>Refreshed: just now</span>
                 <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-full font-normal"><Circle className="h-2 w-2 fill-primary mr-1.5" /> Auto refresh: On</Badge>
                 <Button size="sm" className="h-7 text-xs rounded"><Plus className="h-3 w-3 mr-1" /> Card</Button>
               </div>

               {/* 3 Column Grid */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Recent Card */}
                  <div className="rounded-xl border border-border/40 overflow-hidden flex flex-col shadow-sm">
                     <div className="p-4 font-bold text-sm border-b border-border/20">Recent</div>
                     <div className="p-2 space-y-1 flex-1 overflow-y-auto max-h-[300px] custom-scroll">
                        {recentTasks.length > 0 ? recentTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-md cursor-pointer text-sm transition-colors group">
                             {getStatusIcon(task.status)}
                             <span className="font-medium truncate max-w-[150px]">{task.title}</span>
                             <span className="text-muted-foreground text-[10px] ml-auto">
                               in {spaces.find(s => s.id === task.space_id)?.name || "Space"}
                             </span>
                          </div>
                        )) : (
                          <div className="p-8 text-center text-xs text-muted-foreground italic">No recent tasks</div>
                        )}
                        {!loading && recentTasks.length === 0 && (
                          <div className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-md cursor-pointer text-sm transition-colors">
                             <LayoutList className="h-4 w-4 text-muted-foreground" />
                             <span className="font-medium">Welcome to Campus Hub 🙌</span>
                             <span className="text-muted-foreground text-xs ml-auto">in Space</span>
                          </div>
                        )}
                     </div>
                  </div>

                  {/* Docs Card */}
                  <div className="rounded-xl border border-border/40 overflow-hidden flex flex-col shadow-sm">
                     <div className="p-4 font-bold text-sm border-b border-border/20">Docs</div>
                     <div className="p-8 flex-1 flex flex-col items-center justify-center text-center gap-4">
                        <div className="relative">
                           <FileText className="h-12 w-12 text-muted-foreground/30" strokeWidth={1} />
                           <Plus className="h-4 w-4 absolute -bottom-1 -right-1 text-primary bg-background rounded-full border border-background" />
                        </div>
                        <p className="text-xs text-muted-foreground">There are no Docs in this location yet.</p>
                        <Button variant="secondary" size="sm" className="mt-2 text-xs h-7 bg-primary/10 text-primary hover:bg-primary/20">Add a Doc</Button>
                     </div>
                  </div>

                  {/* Bookmarks Card */}
                  <div className="rounded-xl border border-border/40 overflow-hidden flex flex-col shadow-sm">
                     <div className="p-4 font-bold text-sm border-b border-border/20">Bookmarks</div>
                     <div className="p-8 flex-1 flex flex-col items-center justify-center text-center gap-4">
                        <div className="relative">
                           <Bookmark className="h-12 w-12 text-muted-foreground/30" strokeWidth={1} />
                           <Plus className="h-4 w-4 absolute -bottom-1 -right-1 text-primary bg-background rounded-full border border-background" />
                        </div>
                        <p className="text-xs text-muted-foreground">Bookmarks make it easy to save items or any URL from around the web.</p>
                        <Button variant="secondary" size="sm" className="mt-2 text-xs h-7 bg-primary/10 text-primary hover:bg-primary/20">Add Bookmark</Button>
                     </div>
                  </div>
               </div>

               {/* Folders Wide Card */}
                 <div className="rounded-xl border border-border/40 overflow-hidden flex flex-col shadow-sm">
                    <div className="p-4 font-bold text-sm border-b border-border/20">Folders</div>
                    <div className="p-8 flex-1 flex flex-col items-center justify-center text-center gap-4">
                       <FolderPlus className="h-12 w-12 text-muted-foreground/30" strokeWidth={1} />
                       <p className="text-xs text-muted-foreground">Add new Folder to your Space</p>
                       <Button variant="secondary" size="sm" className="mt-2 text-xs h-7 bg-primary/10 text-primary hover:bg-primary/20" onClick={() => setIsSpaceModalOpen(true)}>Add Folder</Button>
                    </div>
                 </div>

               {/* ── LISTS TABLE ── */}
               <div className="rounded-xl border border-border/40 overflow-hidden shadow-sm">
                 <div className="flex items-center justify-between p-4 border-b border-border/20">
                   <h3 className="font-bold text-sm">Lists</h3>
                   <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setIsSpaceModalOpen(true)}>
                     <Plus className="h-3 w-3" /> New List
                   </Button>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-xs">
                     <thead>
                       <tr className="border-b border-border/20 text-muted-foreground">
                         <th className="text-left font-semibold px-4 py-2.5 w-[35%]">Name</th>
                         <th className="text-left font-semibold px-3 py-2.5 w-[10%]">Color</th>
                         <th className="text-left font-semibold px-3 py-2.5 w-[25%]">Progress</th>
                         <th className="text-left font-semibold px-3 py-2.5">Priority</th>
                         <th className="text-left font-semibold px-3 py-2.5">Owner</th>
                       </tr>
                     </thead>
                     <tbody>
                       {spaces.map((space, i) => {
                         const spaceTasks = tasks.filter(t => t.space_id === space.id);
                         const done = spaceTasks.filter(t => t.status === "done").length;
                         const total = spaceTasks.length;
                         const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                         const colors = ["bg-blue-500","bg-purple-500","bg-green-500","bg-orange-500","bg-pink-500"];
                         return (
                           <tr key={space.id} className="border-b border-border/10 last:border-0 hover:bg-muted/10 cursor-pointer" onClick={() => setActiveCategory(space.id)}>
                             <td className="px-4 py-3 font-medium"><div className="flex items-center gap-2"><span>{space.emoji||"\u{1F4C2}"}</span>{space.name}</div></td>
                             <td className="px-3 py-3"><div className={`h-3 w-3 rounded-sm ${colors[i%colors.length]}`} /></td>
                             <td className="px-3 py-3">
                               <div className="flex items-center gap-2">
                                 <div className="flex-1 bg-muted/30 rounded-full h-1.5 overflow-hidden min-w-[60px]">
                                   <div className="h-full bg-primary rounded-full" style={{width:`${pct}%`}} />
                                 </div>
                                 <span className="text-muted-foreground">{done}/{total}</span>
                               </div>
                             </td>
                             <td className="px-3 py-3 text-muted-foreground">&mdash;</td>
                             <td className="px-3 py-3"><div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[9px] font-bold">Me</div></td>
                           </tr>
                         );
                       })}
                       {spaces.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground italic">No lists yet.</td></tr>}
                     </tbody>
                   </table>
                   <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground hover:bg-muted/10 cursor-pointer border-t border-border/10" onClick={() => setIsSpaceModalOpen(true)}>
                     <Plus className="h-3.5 w-3.5" /> New List
                   </div>
                 </div>
               </div>

               {/* ── RESOURCES + WORKLOAD ── */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Resources */}
                 <div className="rounded-xl border border-border/40 overflow-hidden shadow-sm">
                   <div className="flex items-center justify-between p-4 border-b border-border/20">
                     <h3 className="font-bold text-sm flex items-center gap-2"><Upload className="h-4 w-4 text-muted-foreground" /> Resources</h3>
                     <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => document.getElementById("resource-upload")?.click()}><Plus className="h-3 w-3" /></Button>
                   </div>
                   <div
                     className={`m-3 p-6 flex flex-col items-center justify-center gap-3 min-h-[130px] border-2 border-dashed rounded-xl transition-colors ${isDraggingOverResources ? "border-primary bg-primary/5" : "border-border/30"}`}
                     onDragOver={e => { e.preventDefault(); setIsDraggingOverResources(true); }}
                     onDragLeave={() => setIsDraggingOverResources(false)}
                     onDrop={e => { e.preventDefault(); setIsDraggingOverResources(false); const files = Array.from(e.dataTransfer.files); setResourceFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: (f.size/1024).toFixed(0)+" KB" }))]); toast.success(`${files.length} file(s) added`); }}
                   >
                     {resourceFiles.length > 0 ? (
                       <div className="w-full space-y-1">
                         {resourceFiles.map((f, i) => (
                           <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/10 rounded-lg text-xs">
                             <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-primary" />{f.name}</span>
                             <span className="text-muted-foreground">{f.size}</span>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <>
                         <Upload className="h-8 w-8 text-muted-foreground/30" />
                         <p className="text-xs text-muted-foreground">Drop files here or <span className="text-primary underline cursor-pointer" onClick={() => document.getElementById("resource-upload")?.click()}>attach</span></p>
                       </>
                     )}
                   </div>
                   <input id="resource-upload" type="file" multiple className="hidden" onChange={e => { if (!e.target.files) return; const files = Array.from(e.target.files); setResourceFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: (f.size/1024).toFixed(0)+" KB" }))]); toast.success(`${files.length} file(s) added`); }} />
                 </div>

                 {/* Workload by Status (SVG Pie) */}
                 <div className="rounded-xl border border-border/40 overflow-hidden shadow-sm">
                   <div className="flex items-center gap-2 p-4 border-b border-border/20">
                     <PieChart className="h-4 w-4 text-muted-foreground" />
                     <h3 className="font-bold text-sm">Workload by Status</h3>
                   </div>
                   <div className="p-4 flex items-center justify-center gap-8 min-h-[160px]">
                     {(() => {
                       const st = tasks.filter(t => t.space_id === activeCategory);
                       const todo = st.filter(t => t.status==="todo").length;
                       const inp = st.filter(t => t.status==="in-progress"||t.status==="review").length;
                       const done = st.filter(t => t.status==="done").length;
                       const total = st.length;
                       if (!total) return <div className="flex flex-col items-center gap-2 opacity-30"><PieChart className="h-12 w-12" /><p className="text-xs">No tasks yet</p></div>;
                       const segs = [{l:"IN PROGRESS",n:inp,c:"#3b82f6"},{l:"TO DO",n:todo,c:"#52525b"},{l:"DONE",n:done,c:"#22c55e"}].filter(s=>s.n>0);
                       let ang = -Math.PI/2; const r=55,cx=70,cy=70;
                       const paths = segs.map(s => { const sa=ang; const sw=s.n/total*2*Math.PI; ang+=sw; const lf=sw>Math.PI?1:0; return {...s, d:`M ${cx} ${cy} L ${(cx+r*Math.cos(sa)).toFixed(1)} ${(cy+r*Math.sin(sa)).toFixed(1)} A ${r} ${r} 0 ${lf} 1 ${(cx+r*Math.cos(ang)).toFixed(1)} ${(cy+r*Math.sin(ang)).toFixed(1)} Z`}; });
                       return (<><svg width="140" height="140" className="shrink-0">{paths.map((p,i)=><path key={i} d={p.d} fill={p.c} opacity={0.85}/>)}<circle cx={cx} cy={cy} r={24} fill="var(--background)"/><text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="currentColor">{total}</text><text x={cx} y={cy+14} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="gray">tasks</text></svg><div className="space-y-2">{paths.map((p,i)=><div key={i} className="flex items-center gap-2 text-xs"><div className="h-2.5 w-2.5 rounded-sm" style={{background:p.c}}/><span className="text-muted-foreground">{p.l}</span><span className="font-bold ml-auto pl-3">{p.n}</span></div>)}</div></>);
                     })()}
                   </div>
                 </div>
               </div>

             </div>
           )}

          {/* 📋 LIST VIEW */}
          {activeTab === "list" && (
            <div className="animate-in fade-in duration-300">
               
              {/* List Header */}
               <div className="grid grid-cols-12 gap-4 px-8 py-2 text-xs font-semibold text-muted-foreground border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur z-10">
                 <div className="col-span-6 md:col-span-6 flex items-center">Name</div>
                 <div className="col-span-3 md:col-span-2 text-left">Assignee</div>
                 <div className="hidden md:block col-span-3 text-left">Due date</div>
                 <div className="col-span-3 md:col-span-1 text-right flex justify-end items-center"><Plus className="h-3.5 w-3.5" /></div>
               </div>

               <div className="p-8 space-y-8">
                  {/* Group: IN PROGRESS */}
                  <div className="">
                     <div className="flex items-center gap-2 mb-2 group cursor-pointer">
                        <ChevronRight className="h-4 w-4 rotate-90 transition-transform text-muted-foreground" />
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-md border-primary bg-primary text-primary-foreground">
                        IN PROGRESS
                        </Badge>
                        <span className="text-muted-foreground text-xs ml-1 font-normal opacity-70">2</span>
                     </div>
                     
                     <div className="divide-y divide-border/20 border border-border/40 rounded-lg ml-6 overflow-hidden">
                        {filteredTasks.filter(t => t.status === "in-progress" || t.status === "review").map(task => (
                           <div key={task.id} className="grid grid-cols-12 gap-4 p-2 items-center text-sm hover:bg-muted/10 transition-colors group/row">
                           <div className="col-span-6 md:col-span-6 flex items-center gap-3 pl-2">
                              <button className="shrink-0" onClick={() => handleUpdateTaskStatus(task.id, task.status === "done" ? "todo" : "done")}>{getStatusIcon(task.status)}</button>
                              <span className="font-medium text-[13px]">{task.title}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 ml-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteTask(task.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                           </div>
                           <div className="col-span-3 md:col-span-2">
                              {task.assignee && (
                                <Avatar className="h-6 w-6 border-none ring-2 ring-background">
                                   <AvatarFallback className="text-[10px] bg-[#6B4DFFFF] text-white font-bold">{task.assignee[0]}</AvatarFallback>
                                </Avatar>
                              )}
                           </div>
                           <div className="hidden md:flex items-center gap-2 col-span-3 text-xs text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5" /> {task.due_date || "No date"}
                           </div>
                           <div className="col-span-3 md:col-span-1 flex justify-end pr-2">
                              <Plus className="h-3 w-3 text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-pointer" />
                           </div>
                           </div>
                        ))}
                        <div className="p-2 pl-4 text-xs text-muted-foreground/60 font-medium hover:bg-muted/10 cursor-pointer flex items-center gap-2">
                           <Plus className="h-3.5 w-3.5" /> 
                           <input 
                             placeholder="Add Task" 
                             className="bg-transparent border-none outline-none flex-1"
                             value={newTaskTitle}
                             onChange={(e) => setNewTaskTitle(e.target.value)}
                             onKeyDown={(e) => e.key === "Enter" && activeCategory && openTaskModal(activeCategory, "in-progress")}
                           />
                        </div>
                     </div>
                  </div>

                  {/* Group: TO DO */}
                  <div className="">
                     <div className="flex items-center gap-2 mb-2 group cursor-pointer">
                        <ChevronRight className="h-4 w-4 rotate-90 transition-transform text-muted-foreground" />
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-md border-muted-foreground border-dashed bg-transparent text-muted-foreground">
                        TO DO
                        </Badge>
                        <span className="text-muted-foreground text-xs ml-1 font-normal opacity-70">3</span>
                     </div>
                     
                     <div className="divide-y divide-border/20 border border-border/40 rounded-lg ml-6 overflow-hidden">
                        {filteredTasks.filter(t => t.status === "todo").map(task => (
                           <div key={task.id} className="grid grid-cols-12 gap-4 p-2 items-center text-sm hover:bg-muted/10 transition-colors group/row">
                           <div className="col-span-6 md:col-span-6 flex items-center gap-3 pl-2">
                              <button className="shrink-0" onClick={() => handleUpdateTaskStatus(task.id, "done")}>{getStatusIcon(task.status)}</button>
                              <span className="font-medium text-[13px]">{task.title}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 ml-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteTask(task.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                           </div>
                           <div className="col-span-3 md:col-span-2">
                              {task.assignee && (
                                <Avatar className="h-6 w-6 border-none ring-2 ring-background">
                                   <AvatarFallback className="text-[10px] bg-[#6B4DFFFF] text-white font-bold">{task.assignee[0]}</AvatarFallback>
                                </Avatar>
                              )}
                           </div>
                           <div className="hidden md:flex items-center gap-2 col-span-3 text-xs text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5" /> {task.due_date || "No date"}
                           </div>
                           <div className="col-span-3 md:col-span-1 flex justify-end pr-2">
                              <Plus className="h-3 w-3 text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-pointer" />
                           </div>
                           </div>
                        ))}
                        <div className="p-2 pl-4 text-xs text-muted-foreground/60 font-medium hover:bg-muted/10 cursor-pointer flex items-center gap-2">
                           <Plus className="h-3.5 w-3.5" /> 
                           <input 
                             placeholder="Add Task" 
                             className="bg-transparent border-none outline-none flex-1"
                             value={newTaskTitle}
                             onChange={(e) => setNewTaskTitle(e.target.value)}
                             onKeyDown={(e) => e.key === "Enter" && activeCategory && openTaskModal(activeCategory, "todo")}
                           />
                        </div>
                     </div>
                  </div>

                   {/* Group: DONE */}
                   {filteredTasks.filter(t => t.status === "done").length > 0 && (
                     <div>
                        <div className="flex items-center gap-2 mb-2 cursor-pointer">
                           <ChevronDown className="h-4 w-4 text-muted-foreground" />
                           <Badge className="text-[10px] uppercase font-bold tracking-wider rounded-md bg-green-600 text-white border-0">
                           DONE
                           </Badge>
                           <span className="text-muted-foreground text-xs ml-1 font-normal opacity-70">{filteredTasks.filter(t => t.status === "done").length}</span>
                        </div>
                        <div className="divide-y divide-border/20 border border-border/40 rounded-lg ml-6 overflow-hidden">
                          {filteredTasks.filter(t => t.status === "done").map(task => (
                            <div key={task.id} className="grid grid-cols-12 gap-4 p-2 items-center text-sm hover:bg-muted/10 transition-colors group/row opacity-60">
                            <div className="col-span-6 md:col-span-6 flex items-center gap-3 pl-2">
                               <button className="shrink-0" onClick={() => handleUpdateTaskStatus(task.id, "todo")}>{getStatusIcon(task.status)}</button>
                               <span className="font-medium text-[13px] line-through">{task.title}</span>
                               <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 ml-2">
                                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteTask(task.id)}>
                                   <Trash2 className="h-3 w-3 text-destructive" />
                                 </Button>
                               </div>
                            </div>
                            <div className="col-span-3 md:col-span-2">
                               {task.assignee && (
                                 <Avatar className="h-6 w-6 border-none ring-2 ring-background">
                                    <AvatarFallback className="text-[10px] bg-[#6B4DFFFF] text-white font-bold">{task.assignee[0]}</AvatarFallback>
                                 </Avatar>
                               )}
                            </div>
                            <div className="hidden md:flex items-center gap-2 col-span-3 text-xs text-muted-foreground">
                               <CalendarDays className="h-3.5 w-3.5" /> {task.due_date || "No date"}
                            </div>
                            <div className="col-span-3 md:col-span-1 flex justify-end pr-2">
                               <Plus className="h-3 w-3 text-muted-foreground/30" />
                            </div>
                            </div>
                          ))}
                        </div>
                     </div>
                   )}
               </div>

            </div>
          )}

          {/* 🛹 BOARD VIEW (KANBAN) */}
          {activeTab === "board" && (
            <div className="flex gap-4 h-full p-6 overflow-x-auto pb-4 custom-scroll animate-in fade-in duration-300">
              
              {/* Column: TO DO */}
              <div className="w-[300px] shrink-0 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-md border-muted-foreground border-dashed bg-transparent text-muted-foreground px-2">
                    To Do
                  </Badge>
                  <span className="text-xs text-muted-foreground">2</span>
                  <div className="flex-1" />
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground cursor-pointer" />
                  <Plus className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
                <div className="flex-1 rounded-xl p-2 space-y-2 bg-muted/10 border border-transparent">
                  {filteredTasks.filter(t => t.status === "todo").map(task => (
                    <div key={task.id} className="bg-card p-4 rounded-lg border border-border/40 shadow-sm cursor-pointer hover:border-border transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium leading-normal">{task.title}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-4">
                         <LayoutList className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex items-center justify-start text-xs text-muted-foreground gap-3">
                        {task.assignee && (
                          <Avatar className="h-6 w-6 border-none">
                            <AvatarFallback className="text-[10px] bg-[#6B4DFFFF] text-white font-bold">{task.assignee[0]}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex items-center gap-1 border border-border/40 px-1.5 py-0.5 rounded text-[10px]"><CalendarDays className="h-3 w-3" /> {task.due_date || "No date"}</div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 p-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer mt-1">
                     <Plus className="h-3.5 w-3.5" /> 
                     <input 
                        placeholder="Add Task" 
                        className="bg-transparent border-none outline-none text-xs flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget;
                            if (input.value && activeCategory) {
                              setNewTaskTitle(input.value);
                              openTaskModal(activeCategory, "todo");
                              input.value = "";
                            }
                          }
                        }}
                     />
                  </div>
                </div>
              </div>

              {/* Column: IN PROGRESS */}
              <div className="w-[300px] shrink-0 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-md border-primary bg-primary text-primary-foreground px-2">
                    In Progress
                  </Badge>
                  <span className="text-xs text-muted-foreground">2</span>
                  <div className="flex-1" />
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground cursor-pointer" />
                  <Plus className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
                <div className="flex-1 rounded-xl p-2 space-y-2 bg-muted/10 border border-transparent">
                  {filteredTasks.filter(t => t.status === "in-progress").map(task => (
                    <div key={task.id} className="bg-card p-4 rounded-lg border border-border/40 shadow-sm cursor-pointer hover:border-border transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium leading-normal">{task.title}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-4">
                         <LayoutList className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex items-center justify-start text-xs text-muted-foreground gap-3">
                        {task.assignee && (
                          <Avatar className="h-6 w-6 border-none">
                            <AvatarFallback className="text-[10px] bg-[#6B4DFFFF] text-white font-bold">{task.assignee[0]}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex items-center gap-1 border border-border/40 px-1.5 py-0.5 rounded text-[10px]"><CalendarDays className="h-3 w-3" /> {task.due_date || "No date"}</div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 p-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer mt-1">
                     <Plus className="h-3.5 w-3.5" /> 
                     <input 
                        placeholder="Add Task" 
                        className="bg-transparent border-none outline-none text-xs flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget;
                            if (input.value && activeCategory) {
                              setNewTaskTitle(input.value);
                              openTaskModal(activeCategory, "in-progress");
                              input.value = "";
                            }
                          }
                        }}
                     />
                  </div>
                </div>
              </div>

              {/* Column: DONE */}
              <div className="w-[300px] shrink-0 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-md border-success bg-success text-success-foreground px-2">
                    Complete
                  </Badge>
                  <span className="text-xs text-muted-foreground">1</span>
                  <div className="flex-1" />
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground cursor-pointer" />
                  <Plus className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
                <div className="flex-1 rounded-xl p-2 space-y-2 bg-muted/10 border border-transparent">
                  {filteredTasks.filter(t => t.status === "done").map(task => (
                    <div key={task.id} className="bg-card p-4 rounded-lg border border-border/40 shadow-sm cursor-pointer hover:border-border transition-colors group opacity-80">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium leading-normal">{task.title}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-4">
                         <LayoutList className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex items-center justify-start text-xs text-muted-foreground gap-3">
                        {task.assignee && (
                          <Avatar className="h-6 w-6 border-none grayscale">
                            <AvatarFallback className="text-[10px] bg-[#6B4DFFFF] text-white font-bold">{task.assignee[0]}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex items-center gap-1 border border-border/40 px-1.5 py-0.5 rounded text-[10px]"><CalendarDays className="h-3 w-3" /> {task.due_date || "No date"}</div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 p-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer mt-1">
                     <Plus className="h-3.5 w-3.5" /> 
                     <input 
                        placeholder="Add Task" 
                        className="bg-transparent border-none outline-none text-xs flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget;
                            if (input.value && activeCategory) {
                              setNewTaskTitle(input.value);
                              openTaskModal(activeCategory, "done");
                              input.value = "";
                            }
                          }
                        }}
                     />
                  </div>
                </div>
              </div>

               {/* ADD GROUP */}
               <div className="w-[300px] shrink-0 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer font-medium text-xs mt-1">
                     <Plus className="h-3.5 w-3.5" /> Add group
                  </div>
               </div>

            </div>
          )}

        </div>
      </div>

      {/* ─── CREATE SPACE MODAL ─── */}
      <Dialog open={isSpaceModalOpen} onOpenChange={setIsSpaceModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#1a1a1a] border-border/40 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Space</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Spaces help you organize tasks by project, subject, or team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-semibold">Emoji</label>
                 <Input 
                   className="bg-background/50 border-border/40 h-11 w-16 text-center text-xl"
                   value={newSpaceEmoji}
                   onChange={(e) => setNewSpaceEmoji(e.target.value)}
                   placeholder="📂"
                 />
               </div>
               <div className="space-y-2 flex-1">
                 <label className="text-sm font-semibold">Space Name</label>
                 <Input 
                   placeholder="e.g. History Prep, Project X" 
                   className="bg-background/50 border-border/40 h-11"
                   value={newSpaceName}
                   onChange={(e) => setNewSpaceName(e.target.value)}
                 />
               </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsSpaceModalOpen(false)} className="hover:bg-muted/10">
              Cancel
            </Button>
            <Button 
              onClick={handleAddSpace} 
              disabled={isSubmitting || !newSpaceName.trim()}
              className="bg-primary hover:bg-primary/90 px-8"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Space
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CREATE TASK MODAL ─── */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#1a1a1a] border-border/40 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Task</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add details to your task to keep track of progress.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Task Title</label>
              <Input 
                placeholder="What needs to be done?" 
                className="bg-background/50 border-border/40 h-11"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description (Optional)</label>
              <Textarea 
                placeholder="Add more context..." 
                className="bg-background/50 border-border/40 min-h-[80px] resize-none"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Priority</label>
                <select 
                  className="w-full h-11 bg-background/50 border border-border/40 rounded-md px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                >
                  <option value="Low" className="bg-[#1a1a1a]">Low</option>
                  <option value="Medium" className="bg-[#1a1a1a]">Medium</option>
                  <option value="High" className="bg-[#1a1a1a]">High</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Due Date</label>
                <Input 
                  type="date"
                  className="bg-background/50 border-border/40 h-11"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsTaskModalOpen(false)} className="hover:bg-muted/10">
              Cancel
            </Button>
            <Button 
              onClick={handleAddTask} 
              disabled={isSubmitting || !newTaskTitle.trim()}
              className="bg-primary hover:bg-primary/90 px-8"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── TASK TEMPLATES MODAL ─── */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-[#1a1a1a] border-border/40 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Task Templates</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a pre-defined task to quickly add it to your current space.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {[
              { title: "Weekly Sync", priority: "Medium", description: "Review progress and plan for the next week.", icon: <Clock className="h-5 w-5 text-blue-400" /> },
              { title: "Homework Submission", priority: "High", description: "Ensure all files are formatted correctly and uploaded.", icon: <FileText className="h-5 w-5 text-rose-400" /> },
              { title: "Project Milestone", priority: "High", description: "Key deliverable due for the current project phase.", icon: <CheckCircle2 className="h-5 w-5 text-green-400" /> },
              { title: "Study Session", priority: "Low", description: "Focus time for deep work on current topics.", icon: <Sparkles className="h-5 w-5 text-yellow-400" /> },
              { title: "Review Feedback", priority: "Medium", description: "Go over instructor comments and make corrections.", icon: <Info className="h-5 w-5 text-purple-400" /> },
            ].map((tmpl, i) => (
              <button
                key={i}
                onClick={() => handleApplyTemplate(tmpl)}
                className="flex items-start gap-4 p-4 bg-muted/5 border border-border/20 rounded-2xl hover:bg-muted/10 hover:border-primary/30 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-muted/10 flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                  {tmpl.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-sm tracking-tight">{tmpl.title}</p>
                    <Badge variant="outline" className={`text-[9px] uppercase font-bold ${tmpl.priority === "High" ? "text-rose-400 border-rose-400/30" : "text-muted-foreground border-border/40"}`}>
                      {tmpl.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{tmpl.description}</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors ml-2" />
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTemplateModalOpen(false)} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
