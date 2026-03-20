import { useLocation, useNavigate } from "react-router-dom";
import { NavLink as RouterNavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, Sparkles, BookOpen, NotebookPen, 
  CheckSquare, Layers, CalendarDays, FileCode2,
  Timer, Calculator, TrendingUp, Globe, Users, 
  MessageSquare, ChevronRight 
} from "lucide-react";

type NavItemConfig = { 
  title: string; 
  url: string; 
  icon: React.ReactNode; 
  tourId?: string;
  badge?: number;
};

const NAV_ITEMS_WITH_SUBTITLES: Record<string, string> = {
  "/ai-oracle": "Ask anything",
  "/vault": "Files & lectures",
  "/community": "Connect & discuss",
  "/tasks": "Your to-dos",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function CategorySidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { voiceRoom, activeCommunity } = useApp();
  const { user } = useAuth();
  
  const [toolsExpanded, setToolsExpanded] = useState(false);
  
  const [profileName, setProfileName] = useState("");
  const [profileStatus, setProfileStatus] = useState("🟢 Online");
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fallbackName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Student";
    setProfileName(fallbackName);

    supabase
      .from("profiles")
      .select("display_name, status")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfileName(data.display_name || fallbackName);
          setProfileStatus(data.status || "🟢 Online");
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

    fetchUnreadCount();

    const channel = supabase
      .channel("global-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${user.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  const displayStatus = voiceRoom ? `🔈 In ${voiceRoom}` : profileStatus;
  const isOnline = !voiceRoom && (profileStatus.includes("Online") || profileStatus.includes("Studying"));
  const dotColor = voiceRoom ? "bg-primary" : isOnline ? "bg-success" : profileStatus.includes("Focusing") ? "bg-destructive" : "bg-warning";

  const studyItems: NavItemConfig[] = [
    { title: "Dashboard", url: "/", icon: <LayoutDashboard className="h-4 w-4" />, tourId: "dashboard" },
    { title: "AI Oracle", url: "/ai-oracle", icon: <Sparkles className="h-4 w-4" />, tourId: "ai-oracle" },
    { title: "The Vault", url: "/vault", icon: <BookOpen className="h-4 w-4" />, tourId: "vault" },
    { title: "Notes", url: "/notes", icon: <NotebookPen className="h-4 w-4" /> },
    { title: "Tasks", url: "/tasks", icon: <CheckSquare className="h-4 w-4" /> },
    { title: "Flashcards", url: "/flashcards", icon: <Layers className="h-4 w-4" /> },
    { title: "Calendar", url: "/calendar", icon: <CalendarDays className="h-4 w-4" /> },
  ];

  const toolsItems: NavItemConfig[] = [
    { title: "Workspace", url: "/workspace", icon: <FileCode2 className="h-4 w-4" /> },
    { title: "Pomodoro", url: "/pomodoro", icon: <Timer className="h-4 w-4" /> },
    { title: "GPA Calculator", url: "/gpa", icon: <Calculator className="h-4 w-4" /> },
    { title: "Progress", url: "/progress", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  const campusItems: NavItemConfig[] = [
    { title: "Community", url: "/community", icon: <Globe className="h-4 w-4" />, tourId: "community" },
    { title: "Teams", url: "/teams", icon: <Users className="h-4 w-4" /> },
    { title: "Messages", url: "/messages", icon: <MessageSquare className="h-4 w-4" />, badge: unreadMsgs },
  ];

  const renderNavItem = (item: NavItemConfig) => {
    const isActive = location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url));
    const subtitle = NAV_ITEMS_WITH_SUBTITLES[item.url];

    return (
      <RouterNavLink 
        key={item.url} 
        to={item.url}
        end={item.url === "/"}
        className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 ${
          isActive 
            ? "bg-primary/10 text-primary font-medium shadow-sm shadow-primary/10" 
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
        {...(item.tourId ? { "data-tour": item.tourId } : {})}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0">{item.icon}</div>
          <div className="flex flex-col">
            <p className="text-sm font-medium leading-none">{item.title}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-none">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {item.badge && item.badge > 0 && (
          <span className="shrink-0 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
            {item.badge}
          </span>
        )}
      </RouterNavLink>
    );
  };

  return (
    <div className="w-[240px] shrink-0 flex flex-col bg-card/80 backdrop-blur-xl border-r border-border/40 overflow-hidden" data-tour="sidebar">
      {/* Server name */}
      <div className="h-16 flex items-center px-4 border-b border-border/40 shrink-0">
        <h2 className="font-bold text-base tracking-tight truncate">
          {activeCommunity === "informatics" && "The Hub · Core"}
          {activeCommunity === "mathematics" && "Science · Math"}
          {activeCommunity === "personal" && "My Workspace"}
        </h2>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scroll">
        
        {/* STUDY SECTION */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Study</p>
          {studyItems.map(renderNavItem)}
        </div>

        {/* TOOLS SECTION (Collapsible) */}
        <div>
          <button
            onClick={() => setToolsExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Tools
            <ChevronRight className={`h-3 w-3 transition-transform ${toolsExpanded ? "rotate-90" : ""}`} />
          </button>
          {toolsExpanded && (
            <div className="space-y-1 mt-1">
              {toolsItems.map(renderNavItem)}
            </div>
          )}
        </div>

        {/* CAMPUS SECTION */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Campus</p>
          {campusItems.map(renderNavItem)}
        </div>

      </nav>

      {/* User bar */}
      <button
        onClick={() => navigate("/profile")}
        className="h-16 flex items-center gap-3 px-4 border-t border-border/40 bg-muted/30 shrink-0 hover:bg-muted/50 transition-colors w-full text-left"
      >
        <div className="relative shrink-0">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {profileName ? getInitials(profileName) : "…"}
            </span>
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${dotColor} border-[2.5px] border-background`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{profileName || "Loading…"}</p>
          <p className="text-[11px] text-muted-foreground truncate font-medium">{displayStatus}</p>
        </div>
      </button>
    </div>
  );
}
