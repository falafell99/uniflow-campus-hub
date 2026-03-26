import { useLocation, useNavigate } from "react-router-dom";
import { NavLink as RouterNavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, BookOpen, NotebookPen, 
  CheckSquare, Layers, CalendarDays, 
  Timer, Calculator, TrendingUp, Globe, Users, 
  MessageSquare, ChevronRight, Sun, Briefcase, GraduationCap, User, Settings,
  FileText, Wrench
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CategorySidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [mode, setMode] = useState<"personal" | "campus">(() => {
    return (localStorage.getItem("uniflow-mode") as "personal" | "campus") || "personal";
  });
  
  const [displayName, setDisplayName] = useState("");
  const [onlineCount, setOnlineCount] = useState(1);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    localStorage.setItem("uniflow-mode", mode);
  }, [mode]);

  useEffect(() => {
    if (!user) return;
    const fallbackName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Student";
    setDisplayName(fallbackName);

    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) {
          setDisplayName(data.display_name);
        }
      });

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
      setUnreadMsgs(count || 0);
    };

    const fetchOnlineCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "Online");
      setOnlineCount(count || 0);
    };

    fetchUnreadCount();
    fetchOnlineCount();

    const channel = supabase
      .channel("global-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${user.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    const interval = setInterval(fetchOnlineCount, 60000);

    return () => { 
      channel.unsubscribe(); 
      clearInterval(interval);
    };
  }, [user]);

  const mySpaceNav = [
    { path: "/", label: "Today", icon: Sun, subtitle: "Your daily overview" },
    { path: "/ai-oracle", label: "AI Oracle", icon: Sparkles, subtitle: "Ask anything" },
    { path: "/vault", label: "My Vault", icon: BookOpen, subtitle: "Private files" },
    { path: "/notes", label: "Notes", icon: NotebookPen, subtitle: null },
    { path: "/tasks", label: "Tasks", icon: CheckSquare, subtitle: null },
    { path: "/flashcards", label: "Flashcards", icon: Layers, subtitle: null },
    { path: "/calendar", label: "Calendar", icon: CalendarDays, subtitle: null },
  ];

  const campusNav = [
    { path: "/community", label: "Community", icon: Globe, subtitle: "Feed & discussions" },
    { path: "/vault?mode=community", label: "Public Vault", icon: BookOpen, subtitle: "Shared resources" },
    { path: "/teams", label: "Teams", icon: Users, subtitle: null },
    { path: "/messages", label: "Messages", icon: MessageSquare, subtitle: null, badge: unreadMsgs },
  ];

  const toolsNav = [
    { path: "/pomodoro", label: "Pomodoro", icon: Timer },
    { path: "/gpa", label: "GPA Calculator", icon: Calculator },
    { path: "/progress", label: "Progress", icon: TrendingUp },
    { path: "/workspace", label: "Workspace", icon: FileText },
  ];

  const NavItem = ({ path, label, icon: Icon, subtitle, badge }: any) => {
    let isActive = false;
    if (path === "/") {
      isActive = location.pathname === "/";
    } else {
      const basePath = path.split("?")[0];
      isActive = location.pathname === basePath && (
        !path.includes("?") || location.search === `?${path.split("?")[1]}`
      );
    }

    return (
      <RouterNavLink 
        to={path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
          isActive
            ? "bg-primary/10 text-primary border-l-2 border-primary pl-[10px]"
            : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-none">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{subtitle}</p>}
        </div>
        {badge > 0 && (
          <span className="shrink-0 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
            {badge}
          </span>
        )}
      </RouterNavLink>
    );
  };

  return (
    <div className="w-[240px] md:w-full shrink-0 flex flex-col bg-card/80 backdrop-blur-xl border-r border-border/40 overflow-hidden h-full pt-[env(safe-area-inset-top)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border/20">
        <div className="h-8 w-8 rounded-xl bg-[#3b82f6] flex items-center justify-center text-white font-black text-sm">U</div>
        <div>
          <p className="font-bold text-sm leading-none">UniFlow</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Student OS</p>
        </div>
      </div>

      {/* Mode switcher */}
      <div className="px-3 py-3 border-b border-border/20">
        <div className="flex items-center bg-muted/20 rounded-xl p-1 gap-1">
          <button
            onClick={() => setMode("personal")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === "personal"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            My Space
          </button>
          <button
            onClick={() => setMode("campus")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === "campus"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Campus
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scroll flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === "personal" ? -8 : 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "personal" ? 8 : -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-0.5 px-2 py-2 flex-1"
          >
            {(mode === "personal" ? mySpaceNav : campusNav).map(item => (
              <NavItem key={item.path} {...item} />
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="px-3 mt-4 mb-1">
          <button
            onClick={() => setToolsExpanded(p => !p)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors border border-border/20"
          >
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Tools</span>
            </div>
            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${toolsExpanded ? "rotate-90" : ""}`} />
          </button>
          {toolsExpanded && (
            <div className="space-y-0.5">
              {toolsNav.map(item => <NavItem key={item.path} {...item} />)}
            </div>
          )}
        </div>
      </nav>

      {/* Online Status + User Section */}
      <div className="mt-auto border-t border-border/20 shrink-0">
        {/* Online count */}
        <div className="px-4 py-2 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-muted-foreground">{onlineCount} online now</span>
        </div>
        {/* User card */}
        <div className="p-3">
          <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/20 transition-colors cursor-pointer"
            onClick={() => navigate("/profile")}>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
              {displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName || "Loading..."}</p>
              <p className="text-[10px] text-green-400">Online</p>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
