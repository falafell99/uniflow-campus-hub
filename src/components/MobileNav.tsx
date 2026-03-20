import { LayoutDashboard, BookOpen, Sparkles, Globe, MessageSquare } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

export function MobileNav() {
  const { user } = useAuth();
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (!user) return;

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
      .channel("mobile-nav-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${user.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[4.5rem] bg-background/95 backdrop-blur-md border-t border-border/20 z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
      {[
        { path: "/", icon: <LayoutDashboard className="h-5 w-5" />, label: "Home" },
        { path: "/vault", icon: <BookOpen className="h-5 w-5" />, label: "Vault" },
        { path: "/ai-oracle", icon: <Sparkles className="h-5 w-5" />, label: "Oracle" },
        { path: "/community", icon: <Globe className="h-5 w-5" />, label: "Community" },
        { path: "/messages", icon: <MessageSquare className="h-5 w-5" />, label: "Messages" },
      ].map(item => {
        const isActive = location.pathname === item.path;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all relative ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            activeClassName="text-primary !text-primary"
          >
            <div className="relative">
              {item.icon}
              {item.path === "/messages" && unreadMsgs > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground ring-2 ring-background">
                  {unreadMsgs > 9 ? "9+" : unreadMsgs}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
            {isActive && <div className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />}
          </NavLink>
        );
      })}
    </nav>
  );
}
