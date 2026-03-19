import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { differenceInHours } from "date-fns";

interface UrgentEvent {
  id: string;
  title: string;
  start_time: string;
  event_type: string;
}

export function ReminderBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [urgentEvents, setUrgentEvents] = useState<UrgentEvent[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchUrgent = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("campus_events")
      .select("id, title, start_time, event_type")
      .eq("user_id", user.id)
      .in("event_type", ["deadline", "exam"])
      .gte("start_time", new Date().toISOString())
      .lte("start_time", new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true })
      .limit(2);
    setUrgentEvents(data || []);
  };

  useEffect(() => {
    fetchUrgent();
    const interval = setInterval(fetchUrgent, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const stored = sessionStorage.getItem("dismissed-reminders");
    if (stored) setDismissed(new Set(JSON.parse(stored)));
  }, []);

  const dismissEvent = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    sessionStorage.setItem("dismissed-reminders", JSON.stringify([...next]));
  };

  const visible = urgentEvents.filter(e => !dismissed.has(e.id));
  if (visible.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 px-4 pt-2 pointer-events-none">
      <div className="max-w-[1400px] mx-auto space-y-2">
        <AnimatePresence>
          {visible.map(event => {
            const hoursUntil = differenceInHours(new Date(event.start_time), new Date());
            const isVeryUrgent = hoursUntil <= 6;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm shadow-lg ${
                  isVeryUrgent
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-orange-500/10 border-orange-500/30 text-orange-400"
                }`}
              >
                <span className="text-base">{isVeryUrgent ? "⚡" : "⏰"}</span>
                <span className="font-medium flex-1">
                  {event.title}
                  <span className="font-normal text-muted-foreground ml-2">
                    {hoursUntil < 1
                      ? "due very soon!"
                      : hoursUntil < 24
                        ? `in ${hoursUntil}h`
                        : `in ${Math.floor(hoursUntil / 24)}d`}
                  </span>
                </span>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/calendar")}>
                  View →
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-60" onClick={() => dismissEvent(event.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
