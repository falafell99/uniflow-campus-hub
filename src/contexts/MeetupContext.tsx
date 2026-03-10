/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type Meetup = {
  id: number;
  topic: string;
  subject: string;
  time: string;
  location: string;
  locationType: "in-person" | "online";
  attendees: number;
  max: number;
  joined: boolean;
  host: string;
};

type MeetupContextType = {
  meetups: Meetup[];
  loading: boolean;
  toggleJoin: (id: number) => void;
  createMeetup: (m: Omit<Meetup, "id" | "attendees" | "joined">) => Promise<void>;
};

const MeetupContext = createContext<MeetupContextType | null>(null);

// Fallback demo data shown while DB loads or if unauthenticated
const demoMeetups: Meetup[] = [
  { id: 1, topic: "Linear Algebra Final Prep", subject: "Linear Algebra", time: "Today, 16:00 - 18:00", location: "Library Room 4", locationType: "in-person", attendees: 8, max: 12, joined: true, host: "Márton B." },
  { id: 2, topic: "Algorithms Problem Set #7", subject: "Algorithms", time: "Tomorrow, 14:00 - 16:00", location: "Discord: #algo-study", locationType: "online", attendees: 5, max: 10, joined: true, host: "Eszter N." },
  { id: 3, topic: "Discrete Math Exam Prep", subject: "Discrete Math", time: "Fri, 10:00 - 12:00", location: "Room 2-502, Northern Building", locationType: "in-person", attendees: 15, max: 20, joined: false, host: "Anna K." },
  { id: 4, topic: "OS Concepts Weekly Review", subject: "Operating Systems", time: "Sat, 11:00 - 13:00", location: "Zoom Meeting", locationType: "online", attendees: 7, max: 15, joined: false, host: "Gábor L." },
  { id: 5, topic: "Probability Theory Workshop", subject: "Probability", time: "Sun, 15:00 - 17:00", location: "Library Room 2", locationType: "in-person", attendees: 10, max: 10, joined: false, host: "Dániel T." },
];

export function MeetupProvider({ children }: { children: ReactNode }) {
  const [meetups, setMeetups] = useState<Meetup[]>(demoMeetups);
  const [loading, setLoading] = useState(false);

  // Initialize joined IDs from local storage (default to some demo IDs if empty)
  const [joinedIds, setJoinedIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem("uniflow-joined-meetups");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [1, 2]; // Match the default true values of demo data
  });

  // Keep localStorage in sync with our joinedIds array
  useEffect(() => {
    localStorage.setItem("uniflow-joined-meetups", JSON.stringify(joinedIds));
  }, [joinedIds]);

  // Try to load from Supabase; fall back to demo data silently
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("meetups")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        // Map the DB data to apply local 'joined' state
        setMeetups(
          (data as Meetup[]).map((m) => ({
            ...m,
            joined: joinedIds.includes(m.id),
          }))
        );
      }
      setLoading(false);

      // Real-time subscription
      channel = supabase
        .channel("meetups-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "meetups" }, () => {
          load();
        })
        .subscribe();
    };

    load();
    return () => {
      channel?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedIds]); // Re-run load mapping if user joins/leaves securely locally

  const toggleJoin = async (id: number) => {
    const isCurrentlyJoined = joinedIds.includes(id);

    // 1. Optimistic UI update
    setJoinedIds((prev) =>
      isCurrentlyJoined ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
    setMeetups((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              joined: !isCurrentlyJoined,
              attendees: isCurrentlyJoined ? Math.max(0, m.attendees - 1) : m.attendees + 1,
            }
          : m
      )
    );

    // 2. Persist to DB securely by fetching current count first
    const { data: currentMeetup } = await supabase
      .from("meetups")
      .select("attendees")
      .eq("id", id)
      .single();

    if (currentMeetup) {
      const targetCount = isCurrentlyJoined
        ? Math.max(0, currentMeetup.attendees - 1)
        : currentMeetup.attendees + 1;

      await supabase.from("meetups").update({ attendees: targetCount }).eq("id", id);
    }
  };

  const createMeetup = async (m: Omit<Meetup, "id" | "attendees" | "joined">) => {
    const newMeetup = { ...m, attendees: 1, joined: true }; // Keep 'joined' true for Postgres default insert
    const { data, error } = await supabase.from("meetups").insert(newMeetup).select().single();
    if (!error && data) {
      const inserted = data as Meetup;
      setJoinedIds((prev) => [...prev, inserted.id]);
      setMeetups((prev) => [...prev, { ...inserted, joined: true }]);
    }
  };

  return (
    <MeetupContext.Provider value={{ meetups, loading, toggleJoin, createMeetup }}>
      {children}
    </MeetupContext.Provider>
  );
}

export function useMeetups() {
  const ctx = useContext(MeetupContext);
  if (!ctx) throw new Error("useMeetups must be used within MeetupProvider");
  return ctx;
}
