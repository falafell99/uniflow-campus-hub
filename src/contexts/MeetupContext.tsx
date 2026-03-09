/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode } from "react";

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

const initialMeetups: Meetup[] = [
  { id: 1, topic: "Linear Algebra Final Prep", subject: "Linear Algebra", time: "Today, 16:00 - 18:00", location: "Library Room 4", locationType: "in-person", attendees: 8, max: 12, joined: true, host: "Márton B." },
  { id: 2, topic: "Algorithms Problem Set #7", subject: "Algorithms", time: "Tomorrow, 14:00 - 16:00", location: "Discord: #algo-study", locationType: "online", attendees: 5, max: 10, joined: true, host: "Eszter N." },
  { id: 3, topic: "Discrete Math Exam Prep", subject: "Discrete Math", time: "Fri, 10:00 - 12:00", location: "Room 2-502, Northern Building", locationType: "in-person", attendees: 15, max: 20, joined: false, host: "Anna K." },
  { id: 4, topic: "OS Concepts Weekly Review", subject: "Operating Systems", time: "Sat, 11:00 - 13:00", location: "Zoom Meeting", locationType: "online", attendees: 7, max: 15, joined: false, host: "Gábor L." },
  { id: 5, topic: "Probability Theory Workshop", subject: "Probability", time: "Sun, 15:00 - 17:00", location: "Library Room 2", locationType: "in-person", attendees: 10, max: 10, joined: false, host: "Dániel T." },
];

type MeetupContextType = {
  meetups: Meetup[];
  toggleJoin: (id: number) => void;
};

const MeetupContext = createContext<MeetupContextType | null>(null);

export function MeetupProvider({ children }: { children: ReactNode }) {
  const [meetups, setMeetups] = useState<Meetup[]>(initialMeetups);

  const toggleJoin = (id: number) => {
    setMeetups((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, joined: !m.joined, attendees: m.joined ? m.attendees - 1 : m.attendees + 1 }
          : m
      )
    );
  };

  return (
    <MeetupContext.Provider value={{ meetups, toggleJoin }}>
      {children}
    </MeetupContext.Provider>
  );
}

export function useMeetups() {
  const ctx = useContext(MeetupContext);
  if (!ctx) throw new Error("useMeetups must be used within MeetupProvider");
  return ctx;
}
