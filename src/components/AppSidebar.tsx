import {
  LayoutDashboard, Library, Bot, Users, MessageSquare,
  UserCircle, GraduationCap, NotebookPen, ClipboardList, TrendingUp,
  Timer, Globe, Flame, Settings, Calculator
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { AvatarDisplay, AVATAR_COLORS } from "@/pages/Profile";

const studyItems = [
  { title: "Dashboard",       url: "/",              icon: LayoutDashboard, emoji: "🏠" },
  { title: "Notes",           url: "/notes",         icon: NotebookPen,     emoji: "📝" },
  { title: "Tasks",           url: "/tasks",         icon: ClipboardList,   emoji: "✅" },
  { title: "AI Oracle",       url: "/ai-oracle",     icon: Bot,             emoji: "🤖" },
  { title: "The Vault",       url: "/vault",         icon: Library,         emoji: "📚" },
  { title: "Flashcards",      url: "/flashcards",    icon: Flame,           emoji: "🃏" },
  { title: "Campus Calendar", url: "/calendar",      icon: LayoutDashboard, emoji: "📅" },
  { title: "Progress",        url: "/progress",      icon: TrendingUp,      emoji: "📈" },
  { title: "GPA Calculator",  url: "/gpa",           icon: Calculator,      emoji: "🎓" },
  { title: "Workspace",       url: "/knowledge-graph", icon: GraduationCap, emoji: "🗂" },
  { title: "Pomodoro",        url: "/pomodoro",      icon: Timer,           emoji: "⏱" },
];

const campusItems = [
  { title: "Community",  url: "/community", icon: Globe,         emoji: "🌐" },
  { title: "Teams Hub",  url: "/teams",     icon: Users,         emoji: "👥" },
  { title: "Messages",   url: "/messages",  icon: MessageSquare, emoji: "💬" },
];

type ProfileSnap = { display_name: string; status: string; avatar_color?: string; avatar_emoji?: string };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, onlineUsers } = useAuth();

  const [profile, setProfile] = useState<ProfileSnap | null>(null);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, status, avatar_color, avatar_emoji")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as ProfileSnap);
    };

    const loadInvites = async () => {
      const { count } = await supabase
        .from("team_members")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      setPendingInvites(count || 0);
    };

    const loadOnlineCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "Online");
      setOnlineCount(count || 0);
    };

    const loadUnread = async () => {
      const { count } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
      setUnreadMessages(count || 0);
    };

    loadProfile();
    loadInvites();
    loadOnlineCount();
    loadUnread();

    const profileChannel = supabase
      .channel("sidebar-profile-sync")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, (payload) => {
        setProfile((prev) => ({ ...prev!, ...payload.new as ProfileSnap }));
      })
      .subscribe();

    const invitesChannel = supabase
      .channel("sidebar-invites-sync")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "team_members", 
        filter: `user_id=eq.${user.id}` 
      }, () => {
        loadInvites();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel("sidebar-dm-sync")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "direct_messages",
        filter: `receiver_id=eq.${user.id}`
      }, () => {
        loadUnread();
      })
      .subscribe();

    return () => { 
      profileChannel.unsubscribe(); 
      invitesChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, [user]);

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Student";

  return (
    <Sidebar collapsible="icon" className="glass-sidebar">
      {/* App Header with Logo Mark */}
      <SidebarHeader className="p-0">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border/20">
          <div className="h-8 w-8 rounded-xl bg-[#3b82f6] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[#3b82f6]/20 shrink-0">
            U
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm leading-none">UniFlow</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Student OS</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Study section */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="px-4 pt-5 pb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Study</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {studyItems.map((item) => {
                const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                          isActive 
                            ? "bg-primary/12 text-primary font-semibold border-l-2 border-primary" 
                            : "text-muted-foreground hover:bg-primary/[0.08] hover:text-foreground border-l-2 border-transparent"
                        }`}
                        activeClassName="!bg-primary/12 !text-primary !font-semibold"
                      >
                        <span className="text-base leading-none">{item.emoji}</span>
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Campus section */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="px-4 pt-5 pb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Campus</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {campusItems.map((item) => {
                const isActive = location.pathname.startsWith(item.url === "/" ? "/x-never-match" : item.url);
                const hasBadge = item.title === "Teams Hub" && pendingInvites > 0;
                const hasUnread = item.title === "Messages" && unreadMessages > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                          isActive 
                            ? "bg-primary/12 text-primary font-semibold border-l-2 border-primary" 
                            : "text-muted-foreground hover:bg-primary/[0.08] hover:text-foreground border-l-2 border-transparent"
                        }`}
                        activeClassName="!bg-primary/12 !text-primary !font-semibold"
                      >
                        <span className="text-base leading-none">{item.emoji}</span>
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                        {hasBadge && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                            {pendingInvites}
                          </span>
                        )}
                        {hasUnread && (
                          <span className="ml-auto text-[9px] bg-red-500 text-white px-1.5 rounded-full font-bold">
                            {unreadMessages}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Online Status Indicator */}
        {!collapsed && (
          <div className="px-4 py-2 mt-auto">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>{onlineCount > 0 ? onlineCount : onlineUsers.size || 1} online now</span>
            </div>
          </div>
        )}
      </SidebarContent>

      {/* User Section */}
      <SidebarFooter className="p-3 border-t border-border/20">
        {profile ? (
          <div 
            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/20 transition-colors cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
                  Online
                </p>
              </div>
            )}
            {!collapsed && (
              <Settings 
                className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" 
                onClick={(e) => { e.stopPropagation(); navigate("/profile"); }} 
              />
            )}
          </div>
        ) : (
          !collapsed && (
          <div className="glass-subtle p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">Campus Hub</p>
            <p className="text-[10px] text-muted-foreground/60">Your University Student Portal</p>
          </div>
          )
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
