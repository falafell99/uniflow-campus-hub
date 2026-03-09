import { Calendar, Clock, MapPin, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMeetups } from "@/contexts/MeetupContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import type { Meetup } from "@/contexts/MeetupContext";

export default function Meetups() {
  const { meetups, toggleJoin } = useMeetups();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const MeetupCard = ({ m }: { m: Meetup }) => (
    <div className="glass-card p-5 space-y-3 transition-all duration-300 ease-in-out hover:shadow-lg">
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
          className="flex-1 text-xs transition-all duration-300"
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

  const SkeletonCard = () => (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-32" />
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
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              : meetups.map((m) => <MeetupCard key={m.id} m={m} />)}
          </div>
        </TabsContent>
        <TabsContent value="joined" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
              : meetups.filter((m) => m.joined).map((m) => <MeetupCard key={m.id} m={m} />)}
          </div>
        </TabsContent>
        <TabsContent value="online" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
              : meetups.filter((m) => m.locationType === "online").map((m) => <MeetupCard key={m.id} m={m} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
