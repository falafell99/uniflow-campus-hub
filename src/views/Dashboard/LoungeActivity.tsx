import { useState, useEffect } from "react";
import { Mic, Radio, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/contexts/AppContext";
import { GlassCard } from "@/components/GlassCard";
import { AvatarDisplay, AVATAR_COLORS } from "@/pages/Profile";

interface Participant {
  uid: string;
  display_name: string;
  avatar_color?: string;
  avatar_emoji?: string;
  muted: boolean;
  current_room: string;
}

export function LoungeActivity() {
  const { activeCommunity } = useApp();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const channel = supabase.channel("voice-lobby-dashboard", {
      config: { presence: { key: "dashboard" } }
    });

    const syncPresence = () => {
      const state = channel.presenceState() as Record<string, any[]>;
      const map: Record<string, Participant> = {};
      Object.values(state).forEach((entries) => {
        entries.forEach((entry) => {
          if (entry.uid && entry.current_room) {
            map[entry.uid] = entry as Participant;
          }
        });
      });
      // We only want participants who are actually in a room
      setParticipants(Object.values(map));
      setLoading(false);
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // We don't track ourselves here, just listen
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Filter based on community
  // Note: Preset rooms have specific IDs we can check, or we could just show all
  // For now, let's show all active speakers but maybe highlight or filter if we had rooms in DB with faculty_id
  const activeParticipants = participants.filter(p => !!p.current_room);

  if (activeParticipants.length === 0 && !loading) {
    return null; // Don't show if empty
  }

  return (
    <GlassCard className="border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Radio className="h-4 w-4 text-success animate-pulse" />
          Live in Lounges
        </h2>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {activeParticipants.length} active
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {activeParticipants.map((p) => (
              <div key={p.uid} className="flex items-center gap-2 group cursor-default">
                <div className="relative">
                  <AvatarDisplay
                    name={p.display_name}
                    avatarColor={p.avatar_color ?? AVATAR_COLORS[0].from}
                    avatarEmoji={p.avatar_emoji}
                    size="sm"
                  />
                  {!p.muted && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-background animate-pulse" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold truncate leading-tight">{p.display_name}</p>
                  <p className="text-[9px] text-muted-foreground truncate leading-tight">
                    {p.muted ? "Muted" : "Speaking..."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
