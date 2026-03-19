import { Home, Globe, MessageSquare, BookOpen, User } from "lucide-react";
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/90 backdrop-blur-xl border-t border-border/40 z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
      <NavLink
        to="/"
        end
        className="flex flex-col items-center justify-center w-16 h-full text-muted-foreground hover:text-foreground transition-colors"
        activeClassName="text-primary !text-primary"
      >
        <Home className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-medium leading-none">Home</span>
      </NavLink>

      <NavLink
        to="/community"
        className="flex flex-col items-center justify-center w-16 h-full text-muted-foreground hover:text-foreground transition-colors"
        activeClassName="text-primary !text-primary"
      >
        <Globe className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-medium leading-none">Campus</span>
      </NavLink>

      <NavLink
        to="/messages"
        className="flex flex-col items-center justify-center w-16 h-full text-muted-foreground hover:text-foreground transition-colors relative"
        activeClassName="text-primary !text-primary"
      >
        <div className="relative mb-1">
          <MessageSquare className="h-5 w-5" />
          {unreadMsgs > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground ring-2 ring-background">
              {unreadMsgs > 9 ? "9+" : unreadMsgs}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium leading-none">Chat</span>
      </NavLink>

      <NavLink
        to="/vault"
        className="flex flex-col items-center justify-center w-16 h-full text-muted-foreground hover:text-foreground transition-colors"
        activeClassName="text-primary !text-primary"
      >
        <BookOpen className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-medium leading-none">Vault</span>
      </NavLink>

      <NavLink
        to="/profile"
        className="flex flex-col items-center justify-center w-16 h-full text-muted-foreground hover:text-foreground transition-colors"
        activeClassName="text-primary !text-primary"
      >
        <User className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-medium leading-none">Profile</span>
      </NavLink>
    </nav>
  );
}
