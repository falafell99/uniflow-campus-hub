import { Sun, BookOpen, Sparkles, Globe, MessageSquare } from "lucide-react";
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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/30 bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) / 3)" }}
    >
      <div className="flex items-center justify-around h-14">
        {[
          { path: "/", icon: Sun, label: "Today" },
          { path: "/vault", icon: BookOpen, label: "Vault" },
          { path: "/ai-oracle", icon: Sparkles, label: "Oracle" },
          { path: "/community", icon: Globe, label: "Campus" },
          { path: "/messages", icon: MessageSquare, label: "Messages" },
        ].map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={`flex flex-col items-center gap-0.5 px-3 transition-colors relative ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.path === "/messages" && unreadMsgs > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unreadMsgs > 9 ? "9+" : unreadMsgs}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {isActive && <div className="h-1 w-1 rounded-full bg-primary mt-0.5" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
