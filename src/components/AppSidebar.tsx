import {
  LayoutDashboard, Library, Bot, Users, MessageSquare,
  Star, Wrench, UserCircle, GraduationCap
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, emoji: "🏠" },
  { title: "The Vault", url: "/vault", icon: Library, emoji: "📚" },
  { title: "AI Oracle", url: "/ai-oracle", icon: Bot, emoji: "🤖" },
  { title: "Meetups", url: "/meetups", icon: Users, emoji: "🤝" },
  { title: "Forums", url: "/forums", icon: MessageSquare, emoji: "💬" },
  { title: "Professor Radar", url: "/professors", icon: Star, emoji: "⭐" },
  { title: "Toolbox", url: "/toolbox", icon: Wrench, emoji: "🛠" },
  { title: "Profile", url: "/profile", icon: UserCircle, emoji: "👤" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
              <span className="text-[11px] font-medium text-muted-foreground">ELTE · Informatics</span>
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
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="!bg-sidebar-accent !text-sidebar-accent-foreground"
                      >
                        <span className="text-base leading-none">{item.emoji}</span>
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="glass-subtle p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">Made for ELTE Students</p>
            <p className="text-[10px] text-muted-foreground/60">Faculty of Informatics</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
