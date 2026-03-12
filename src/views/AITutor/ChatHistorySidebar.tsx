import { useState, useEffect } from "react";
import { MessageSquare, Clock, Trash2, Search, X, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { GlassCard } from "@/components/GlassCard";

interface Session {
  id: string;
  title: string;
  created_at: string;
}

interface ChatHistorySidebarProps {
  open: boolean;
  onClose: () => void;
  onSelectSession: (id: string, title: string) => void;
  activeSessionId: string | null;
}

export function ChatHistorySidebar({ open, onClose, onSelectSession, activeSessionId }: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadSessions();
  }, [open]);

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
    if (!error) {
      setSessions(sessions.filter(s => s.id !== id));
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-background/95 backdrop-blur-xl border-l border-border/40 z-50 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-primary" />
          <h2 className="font-bold text-sm">Chat History</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Search chats..." 
            className="pl-9 h-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
        {loading ? (
          <div className="flex flex-col gap-2 p-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-10 px-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No sessions found</p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id, session.title)}
              className={`w-full text-left p-3 rounded-xl transition-all group relative overflow-hidden ${
                activeSessionId === session.id 
                  ? "bg-primary/10 border-primary/20 border" 
                  : "hover:bg-muted/50 border border-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                    {session.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(session.created_at))} ago</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => deleteSession(e, session.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border/40 text-center">
        <p className="text-[10px] text-muted-foreground">Conversations are saved automatically</p>
      </div>
    </div>
  );
}
