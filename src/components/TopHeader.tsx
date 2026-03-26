import { Search, Bell, X, GraduationCap, Sun, Moon, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SplitScreen } from "@/components/SplitScreen";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

type Notification = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
};

export function TopHeader() {
  const [search, setSearch] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { credits, tutoringAvailable } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch and subscribe to notifications
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel("global_notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistically update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);
  };


  return (
    <header className="sticky top-0 z-30 flex h-[calc(3rem+env(safe-area-inset-top))] items-end pb-3 gap-3 border-b border-border/40 bg-background/70 backdrop-blur-xl px-4 shrink-0 transition-all">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 flex w-[288px] gap-0 border-r border-border/40" hideClose>
          <CategorySidebar />
        </SheetContent>
      </Sheet>

      <motion.div
        className="relative flex-1 max-w-xl group"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search everything..."
          className="pl-9 pr-20 h-8 text-sm bg-muted/50 border border-transparent focus-visible:ring-1 focus-visible:ring-primary/30 group-hover:bg-muted/80 transition-all cursor-pointer"
          onFocus={(e) => {
            e.target.blur();
            window.dispatchEvent(new CustomEvent("open-command-palette"));
          }}
          onKeyDown={(e) => {
            if (e.key !== "Tab" && !e.metaKey && !e.ctrlKey && !e.altKey) {
              window.dispatchEvent(new CustomEvent("open-command-palette", { detail: { query: e.key.length === 1 ? e.key : "" } }));
            }
          }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          <div className="hidden sm:flex items-center gap-0.5">
            <kbd className="bg-background border border-border/40 rounded px-1 text-[10px] font-mono text-muted-foreground">⌘</kbd>
            <kbd className="bg-background border border-border/40 rounded px-1 text-[10px] font-mono text-muted-foreground">K</kbd>
          </div>
        </div>
      </motion.div>

      {/* Tutoring badge */}
      {tutoringAvailable && (
        <Badge variant="outline" className="hidden sm:flex text-[10px] gap-1 bg-success/10 text-success border-success/20 shrink-0">
          <GraduationCap className="h-3 w-3" /> Tutoring
        </Badge>
      )}



      {/* Theme Toggle & Split Screen */}
      <SplitScreen />
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={toggleTheme}>
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8 shrink-0">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="p-3 border-b flex items-center justify-between">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto custom-scroll">
            {notifications.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">You're caught up!</p>
                <p className="text-xs">No new notifications.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const date = new Date(n.created_at);
                const isToday = date.toDateString() === new Date().toDateString();
                const timeString = isToday 
                  ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                return (
                  <button 
                    key={n.id} 
                    className={`w-full text-left px-3 py-3 border-b border-border/40 hover:bg-muted/50 transition-colors last:border-0 ${!n.read ? "bg-primary/5 cursor-pointer" : "opacity-80 cursor-default"}`}
                    onClick={async () => {
                      if (!n.read) {
                        setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                        await supabase.from("notifications").update({ read: true }).eq("id", n.id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      {!n.read && <span className="h-2 w-2 mt-1 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className={`text-xs ${!n.read ? "text-foreground/80" : "text-muted-foreground"}`}>{n.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">{timeString}</p>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </header>
  );
}
