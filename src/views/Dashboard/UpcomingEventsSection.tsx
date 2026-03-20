import { useState, useEffect } from "react";
import { format, parseISO, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, BookOpen, Video, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type EventType = "exam" | "deadline" | "meetup" | "personal";

interface CampusEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_time: string;
  end_time: string | null;
}

const EVENT_COLORS: Record<EventType, string> = {
  exam: "bg-red-500/10 text-red-600 border-red-500/20",
  deadline: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  meetup: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  personal: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  exam: <BookOpen className="h-4 w-4" />,
  deadline: <Clock className="h-4 w-4" />,
  meetup: <Video className="h-4 w-4" />,
  personal: <User className="h-4 w-4" />,
};

export function UpcomingEventsSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('campus_events')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(4);
          
        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    
    const channel = supabase
      .channel('campus_events_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_events' }, fetchEvents)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <GlassCard className="flex flex-col h-full bg-gradient-to-b from-card to-card/50 border-border/40 shadow-sm relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" /> 
          Upcoming
        </h2>
        <Button variant="ghost" size="sm" className="text-xs h-7 hover:bg-muted" onClick={() => navigate('/calendar')}>
          View all
        </Button>
      </div>

      <div className="flex-1 flex flex-col gap-3 relative z-10">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center p-3 rounded-xl border border-border/20">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : events.length > 0 ? (
          events.map(event => {
            const date = parseISO(event.start_time);
            return (
              <div key={event.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors hover:bg-muted/10 ${EVENT_COLORS[event.event_type]}`}>
                <div className="flex flex-col items-center justify-center h-10 w-10 shrink-0 bg-background/50 rounded-lg shadow-sm border border-current/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 leading-none">{format(date, 'MMM')}</span>
                  <span className="text-sm font-black leading-none mt-1">{format(date, 'd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {EVENT_ICONS[event.event_type]}
                    <span className="font-semibold text-sm truncate text-foreground">{event.title}</span>
                  </div>
                  <div className="flex items-center text-xs opacity-80 gap-2">
                    <span className="capitalize">{event.event_type}</span>
                    <span className="h-1 w-1 rounded-full bg-current opacity-50" />
                    <span>{format(date, "h:mm a")}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border/40 rounded-xl">
            <CalendarIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium text-foreground/80">Your schedule is clear</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">No upcoming exams or deadlines.</p>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate('/calendar')}>
              Add Event
            </Button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
