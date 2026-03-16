import {
  LayoutDashboard, Library, Bot, Users, MessageSquare,
  Star, Wrench, UserCircle, GraduationCap, Briefcase, NotebookPen, ClipboardList
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { AvatarDisplay, AVATAR_COLORS } from "@/pages/Profile";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, emoji: "🏠" },
  { title: "Teams Hub", url: "/teams", icon: Users, emoji: "👥" },
  { title: "Workspace", url: "/knowledge-graph", icon: GraduationCap, emoji: "📋" },
  { title: "Notes", url: "/notes", icon: NotebookPen, emoji: "📝" },
  { title: "Tasks", url: "/tasks", icon: ClipboardList, emoji: "📋" },
  { title: "The Vault", url: "/vault", icon: Library, emoji: "📚" },
  { title: "AI Oracle", url: "/ai-oracle", icon: Bot, emoji: "🤖" },
  { title: "Whiteboard", url: "/whiteboard", icon: Star, emoji: "🎨" },
  { title: "Meetups", url: "/meetups", icon: Users, emoji: "🤝" },
  { title: "Forums", url: "/forums", icon: MessageSquare, emoji: "💬" },
  { title: "Internships", url: "/internships", icon: Briefcase, emoji: "💼" },
  { title: "Messages", url: "/messages", icon: MessageSquare, emoji: "💬" },
  { title: "Professor Radar", url: "/professors", icon: Star, emoji: "⭐" },
  { title: "Toolbox", url: "/toolbox", icon: Wrench, emoji: "🛠" },
  { title: "Profile", url: "/profile", icon: UserCircle, emoji: "👤" },
];

type ProfileSnap = { display_name: string; status: string; avatar_color?: string; avatar_emoji?: string };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, onlineUsers } = useAuth();

  const [profile, setProfile] = useState<ProfileSnap | null>(null);
  const [pendingInvites, setPendingInvites] = useState(0);

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

    loadProfile();
    loadInvites();

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

    return () => { 
      profileChannel.unsubscribe(); 
      invitesChannel.unsubscribe();
    };
  }, [user]);

  return (
    <Sidebar collapsible="icon" className="glass-sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground">UniFlow</span>
              <span className="text-[11px] font-medium text-muted-foreground">University Hub</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                const hasBadge = item.title === "Teams Hub" && pendingInvites > 0;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative"
                        activeClassName="!bg-sidebar-accent !text-sidebar-accent-foreground"
                      >
                        <span className="text-base leading-none">{item.emoji}</span>
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                        {hasBadge && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                            {pendingInvites}
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
      </SidebarContent>

      <SidebarFooter className="p-3">
        {profile ? (
          <NavLink to="/profile" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sidebar-accent transition-colors group">
            <AvatarDisplay
              name={profile.display_name}
              avatarColor={profile.avatar_color}
              avatarEmoji={profile.avatar_emoji}
              size="sm"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{profile.display_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {onlineUsers.size > 0 ? "🟢 Online" : profile.status}
                </p>
              </div>
            )}
          </NavLink>
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
