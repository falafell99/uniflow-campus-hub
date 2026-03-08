import { useState } from "react";
import { Calendar, Clock, MapPin, Users, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const meetups = [
  { id: 1, topic: "Linear Algebra Final Prep", subject: "Linear Algebra", time: "Today, 16:00 - 18:00", location: "Library Room 4", locationType: "in-person", attendees: 8, max: 12, joined: true, host: "Márton B." },
  { id: 2, topic: "Algorithms Problem Set #7", subject: "Algorithms", time: "Tomorrow, 14:00 - 16:00", location: "Discord: #algo-study", locationType: "online", attendees: 5, max: 10, joined: true, host: "Eszter N." },
  { id: 3, topic: "Discrete Math Exam Prep", subject: "Discrete Math", time: "Fri, 10:00 - 12:00", location: "Room 2-502, Northern Building", locationType: "in-person", attendees: 15, max: 20, joined: false, host: "Anna K." },
  { id: 4, topic: "OS Concepts Weekly Review", subject: "Operating Systems", time: "Sat, 11:00 - 13:00", location: "Zoom Meeting", locationType: "online", attendees: 7, max: 15, joined: false, host: "Gábor L." },
  { id: 5, topic: "Probability Theory Workshop", subject: "Probability", time: "Sun, 15:00 - 17:00", location: "Library Room 2", locationType: "in-person", attendees: 10, max: 10, joined: false, host: "Dániel T." },
];

export default function Meetups() {
  const [meetupData, setMeetupData] = useState(meetups);

  const toggleJoin = (id: number) => {
    setMeetupData((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, joined: !m.joined, attendees: m.joined ? m.attendees - 1 : m.attendees + 1 } : m
      )
    );
  };

  const MeetupCard = ({ m }: { m: typeof meetups[0] }) => (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm">{m.topic}</h3>
          <Badge variant="outline" className="mt-1.5 text-[10px]">{m.subject}</Badge>
        </div>
        <Badge variant={m.locationType === "online" ? "secondary" : "outline"} className="text-[10px]">
          {m.locationType === "online" ? "🌐 Online" : "📍 In-person"}
        </Badge>
      </div>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{m.time}</div>
        <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{m.location}</div>
        <div className="flex items-center gap-1.5"><Users className="h-3 w-3" />{m.attendees}/{m.max} attending · Hosted by {m.host}</div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          onClick={() => toggleJoin(m.id)}
          variant={m.joined ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs"
          disabled={!m.joined && m.attendees >= m.max}
        >
          {m.joined ? "Joined ✓" : m.attendees >= m.max ? "Full" : "I'm Joining"}
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1">
          <Calendar className="h-3 w-3" /> Add to Calendar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🤝 Meetups & Study Circles</h1>
          <p className="text-muted-foreground mt-1">Organize and join study sessions</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Create Meetup</Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Meetups</TabsTrigger>
          <TabsTrigger value="joined">My Meetups</TabsTrigger>
          <TabsTrigger value="online">Online</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {meetupData.map((m) => <MeetupCard key={m.id} m={m} />)}
          </div>
        </TabsContent>
        <TabsContent value="joined" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {meetupData.filter((m) => m.joined).map((m) => <MeetupCard key={m.id} m={m} />)}
          </div>
        </TabsContent>
        <TabsContent value="online" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {meetupData.filter((m) => m.locationType === "online").map((m) => <MeetupCard key={m.id} m={m} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
