import { Search, Bell, X, Tag, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";

const notifications = [
  { id: 1, text: "New notes uploaded for Linear Algebra", time: "5 min ago", unread: true },
  { id: 2, text: "Study group for Algorithms starting in 1h", time: "30 min ago", unread: true },
  { id: 3, text: "Prof. Kovács posted new slides for Discrete Math", time: "2h ago", unread: false },
];

export function TopHeader() {
  const [search, setSearch] = useState("");
  const { credits, tutoringAvailable } = useApp();

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border/40 bg-background/70 backdrop-blur-xl px-4 shrink-0">
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search or press ⌘K to jump..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Tutoring badge */}
      {tutoringAvailable && (
        <Badge variant="outline" className="text-[10px] gap-1 bg-success/10 text-success border-success/20 shrink-0">
          <GraduationCap className="h-3 w-3" /> Tutoring
        </Badge>
      )}

      {/* Credits */}
      <div className="flex items-center gap-1.5 glass-subtle px-2.5 py-1 rounded-full shrink-0">
        <Tag className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">{credits.toLocaleString()} Credits</span>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              2
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">Notifications</h4>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scroll">
            {notifications.map((n) => (
              <div key={n.id} className={`px-3 py-2.5 border-b last:border-0 ${n.unread ? "bg-primary/5" : ""}`}>
                <p className="text-sm">{n.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </header>
  );
}
