import { Clock, MapPin, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/GlassCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useNavigate } from "react-router-dom";

interface Meetup {
  id: number;
  topic: string;
  time: string;
  location: string;
  attendees: number;
  max: number;
  joined: boolean;
}

interface MeetupsSectionProps {
  meetups: Meetup[];
  loading: boolean;
}

export function MeetupsSection({ meetups, loading }: MeetupsSectionProps) {
  const navigate = useNavigate();
  const joined = meetups.filter((m) => m.joined);

  return (
    <GlassCard>
      <SectionHeader
        title="Upcoming Meetups"
        Icon={Users}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs"
            onClick={() => navigate("/meetups")}
          >
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        }
      />
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-subtle p-3.5 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-7 w-20 ml-3" />
            </div>
          ))
        ) : joined.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No meetups joined yet</p>
            <Button variant="link" size="sm" onClick={() => navigate("/meetups")}>
              Browse meetups
            </Button>
          </div>
        ) : (
          joined.map((m) => (
            <div
              key={m.id}
              onClick={() => navigate("/meetups")}
              className="glass-subtle p-3.5 flex items-center justify-between transition-all duration-300 hover:bg-muted/30 hover:shadow-md cursor-pointer border border-transparent hover:border-primary/20 group"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{m.topic}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{m.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{m.location}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className="text-xs text-muted-foreground">{m.attendees}/{m.max}</span>
                <Button size="sm" className="h-7 text-xs pointer-events-none">Joined ✓</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
