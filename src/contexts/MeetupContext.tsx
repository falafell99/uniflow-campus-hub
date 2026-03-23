/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { publishToFeed } from "@/lib/feed";

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
  date_time?: string;
  meeting_link?: string;
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
  const [dbMeetups, setDbMeetups] = useState<Meetup[]>(demoMeetups);
  const [loading, setLoading] = useState(false);

  // Initialize joined IDs from local storage
  const [joinedIds, setJoinedIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem("uniflow-joined-meetups");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Keep localStorage in sync with our joinedIds array
  useEffect(() => {
    localStorage.setItem("uniflow-joined-meetups", JSON.stringify(joinedIds));
  }, [joinedIds]);

  // Hook 1: Subscribe to DB exactly once, fetch pure raw data
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchRawData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("meetups")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        setDbMeetups(data as Meetup[]);
      }
      setLoading(false);
    };

    fetchRawData();

    // Set up the websocket once. Never tear it down unless component unmounts.
    channel = supabase
      .channel("meetups-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetups" }, () => {
        fetchRawData();
      })
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, []);

  // Hook 2: Merge the realtime raw db data with the purely local joined state
  useEffect(() => {
    if (dbMeetups === demoMeetups) return; // Only apply if we have real DB data

    setMeetups(
      dbMeetups.map((m) => ({
        ...m,
        joined: joinedIds.includes(m.id),
      }))
    );
  }, [dbMeetups, joinedIds]);

  const toggleJoin = async (id: number) => {
    const isCurrentlyJoined = joinedIds.includes(id);

    // 1. Optimistic UI update securely
    setJoinedIds((prev) =>
      isCurrentlyJoined ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
    // Instant mapping will automatically trigger Hook 2 for immediate UI feedback.

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
    const newMeetup = { ...m, attendees: 1, joined: true };
    const { data, error } = await supabase.from("meetups").insert(newMeetup).select().single();
    if (!error && data) {
      const inserted = data as Meetup;
      setJoinedIds((prev) => [...prev, inserted.id]);
      publishToFeed("meetup_created", inserted.id.toString(), inserted.topic, inserted.subject);
      // The websocket insert ping will instantly refetch 'dbMeetups' and do the rest!
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
