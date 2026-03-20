import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type NavItem = { title: string; url: string; emoji: string; tourId?: string };

const categories: { label: string; items: NavItem[] }[] = [
  {
    label: "MAIN",
    items: [
      { title: "Dashboard", url: "/", emoji: "🏠", tourId: "dashboard" },
      { title: "Progress", url: "/progress", emoji: "📈" },
      { title: "Messages", url: "/messages", emoji: "💌" },
      { title: "Teams Hub", url: "/teams", emoji: "👥" },
    ],
  },
  {
    label: "STUDY",
    items: [
      { title: "Workspace", url: "/knowledge-graph", emoji: "📋" },
      { title: "Notes", url: "/notes", emoji: "📝" },
      { title: "Tasks", url: "/tasks", emoji: "📋" },
      { title: "AI Oracle", url: "/ai-oracle", emoji: "🤖", tourId: "ai-oracle" },
      { title: "The Vault", url: "/vault", emoji: "📚", tourId: "vault" },
      { title: "Professor Ratings", url: "/professors", emoji: "⭐" },
      { title: "Flashcards", url: "/flashcards", emoji: "🗂️" },
      { title: "Pomodoro", url: "/pomodoro", emoji: "⏱️" },
      { title: "Campus Calendar", url: "/calendar", emoji: "📅" },
    ],
  },
  {
    label: "CAMPUS",
    items: [
      { title: "Community Hub", url: "/community", emoji: "🌐", tourId: "community" },
    ],
  },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function CategorySidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { voiceRoom, activeCommunity } = useApp();
  const { user } = useAuth();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    MAIN: true, STUDY: true, CAMPUS: true,
  });
  const [profileName, setProfileName] = useState("");
  const [profileStatus, setProfileStatus] = useState("🟢 Online");
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  // Load real name + status from profiles table
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

    // Realtime subscription for global unread badge
    // We refetch the count on any change because Supabase doesn't send payload.old values by default
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

  return (
    <div className="w-[220px] shrink-0 flex flex-col bg-card/80 backdrop-blur-xl border-r border-border/40 overflow-hidden" data-tour="sidebar">
      {/* Server name */}
      <div className="h-12 flex items-center px-4 border-b border-border/40 shrink-0">
        <h2 className="font-bold text-sm tracking-tight truncate">
          {activeCommunity === "informatics" && "The Hub · Core"}
          {activeCommunity === "mathematics" && "Science · Math"}
          {activeCommunity === "personal" && "My Workspace"}
        </h2>
      </div>

      {/* Status */}
      <div className="px-3 py-2 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full shrink-0 animate-pulse ${voiceRoom ? "bg-primary" : "bg-success"}`} />
          <span className="truncate">{displayStatus}</span>
        </div>
      </div>

      {/* Categories */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto custom-scroll">
        {categories.map((cat) => (
          <Collapsible
            key={cat.label}
            open={openCategories[cat.label]}
            onOpenChange={(open) => setOpenCategories((p) => ({ ...p, [cat.label]: open }))}
          >
            <CollapsibleTrigger className="flex items-center gap-1 w-full px-1 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className={`h-3 w-3 transition-transform ${openCategories[cat.label] ? "" : "-rotate-90"}`} />
              <span>{cat.label}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-0.5 mt-0.5">
                {cat.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      end={item.url === "/"}
                      className={`flex items-center justify-between gap-2.5 px-2 py-1.5 rounded-md text-sm transition-all duration-200 ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium shadow-sm shadow-primary/10"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                      activeClassName=""
                      {...(item.tourId ? { "data-tour": item.tourId } : {})}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-sm leading-none shrink-0">{item.emoji}</span>
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.title === "Messages" && unreadMsgs > 0 && (
                        <span className="shrink-0 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                          {unreadMsgs}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </nav>

      {/* User bar */}
      <button
        onClick={() => navigate("/profile")}
        className="h-14 flex items-center gap-2.5 px-3 border-t border-border/40 bg-muted/30 shrink-0 hover:bg-muted/50 transition-colors w-full text-left"
      >
        <div className="relative shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {profileName ? getInitials(profileName) : "…"}
            </span>
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${dotColor} border-2 border-background`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{profileName || "Loading…"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{displayStatus}</p>
        </div>
      </button>
    </div>
  );
}
