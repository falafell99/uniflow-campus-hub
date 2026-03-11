import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type NavItem = { title: string; url: string; emoji: string };

const categories: { label: string; emoji: string; items: NavItem[] }[] = [
  {
    label: "ACADEMIC", emoji: "🎓",
    items: [
      { title: "Dashboard", url: "/", emoji: "🏠" },
      { title: "The Vault", url: "/vault", emoji: "📚" },
      { title: "AI Oracle", url: "/ai-oracle", emoji: "🤖" },
      { title: "Past Exams Hub", url: "/past-exams", emoji: "📝" },
      { title: "Knowledge Graph", url: "/knowledge-graph", emoji: "🧠" },
      { title: "Flashcards", url: "/flashcards", emoji: "🃏" },
    ],
  },
  {
    label: "SOCIAL", emoji: "🤝",
    items: [
      { title: "Lobby", url: "/forums", emoji: "💬" },
      { title: "Messages", url: "/messages", emoji: "💌" },
      { title: "Study Circles", url: "/meetups", emoji: "🤝" },
      { title: "Voice Lounges", url: "/voice-lounges", emoji: "🎙" },
    ],
  },
  {
    label: "GROWTH", emoji: "🏆",
    items: [
      { title: "Professor Radar", url: "/professors", emoji: "⭐" },
      { title: "Internship Board", url: "/internships", emoji: "💼" },
      { title: "Mentorship", url: "/profile", emoji: "👤" },
    ],
  },
  {
    label: "UTILS", emoji: "🛠",
    items: [
      { title: "Resource Toolbox", url: "/toolbox", emoji: "🛠" },
      { title: "Marketplace", url: "/marketplace", emoji: "🏪" },
      { title: "Pomodoro", url: "/pomodoro", emoji: "⏱" },
      { title: "Workspace", url: "/workspace", emoji: "📝" },
      { title: "Studio", url: "/studio", emoji: "🎨" },
    ],
  },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function CategorySidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { voiceRoom } = useApp();
  const { user } = useAuth();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    ACADEMIC: true, SOCIAL: true, GROWTH: true, UTILS: true,
  });
  const [profileName, setProfileName] = useState("");
  const [profileStatus, setProfileStatus] = useState("🟢 Online");

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
  }, [user]);

  const displayStatus = voiceRoom ? `🔈 In ${voiceRoom}` : profileStatus;
  const isOnline = !voiceRoom && (profileStatus.includes("Online") || profileStatus.includes("Studying"));
  const dotColor = voiceRoom ? "bg-primary" : isOnline ? "bg-success" : profileStatus.includes("Focusing") ? "bg-destructive" : "bg-warning";

  return (
    <div className="w-[220px] shrink-0 flex flex-col bg-card/80 backdrop-blur-xl border-r border-border/40 overflow-hidden">
      {/* Server name */}
      <div className="h-12 flex items-center px-4 border-b border-border/40 shrink-0">
        <h2 className="font-bold text-sm tracking-tight truncate">ELTE · Informatics</h2>
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
              <span>{cat.emoji} {cat.label}</span>
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
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-all duration-200 ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium shadow-sm shadow-primary/10"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                      activeClassName=""
                    >
                      <span className="text-sm leading-none">{item.emoji}</span>
                      <span className="truncate">{item.title}</span>
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
