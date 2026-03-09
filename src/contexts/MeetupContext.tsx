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
        setMeetups(data as Meetup[]);
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
    return () => { channel?.unsubscribe(); };
  }, []);

  const toggleJoin = async (id: number) => {
    // Optimistic update
    setMeetups((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, joined: !m.joined, attendees: m.joined ? m.attendees - 1 : m.attendees + 1 }
          : m
      )
    );
    // Persist to DB
    const meetup = meetups.find((m) => m.id === id);
    if (meetup) {
      await supabase.from("meetups").update({
        attendees: meetup.joined ? meetup.attendees - 1 : meetup.attendees + 1,
      }).eq("id", id);
    }
  };

  const createMeetup = async (m: Omit<Meetup, "id" | "attendees" | "joined">) => {
    const newMeetup = { ...m, attendees: 1, joined: true };
    const { data, error } = await supabase.from("meetups").insert(newMeetup).select().single();
    if (!error && data) {
      setMeetups((prev) => [...prev, data as Meetup]);
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
