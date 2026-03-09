import { useState } from "react";
import { Calendar, Clock, MapPin, Users, Plus, Loader2, Wifi, Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeetups } from "@/contexts/MeetupContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Meetup } from "@/contexts/MeetupContext";

const SUBJECTS = ["Linear Algebra", "Calculus I", "Calculus II", "Algorithms", "Data Structures", "Discrete Math", "Probability Theory", "Operating Systems", "Programming", "Other"];
const TIME_SLOTS = ["Today, 14:00 - 16:00", "Today, 16:00 - 18:00", "Today, 18:00 - 20:00", "Tomorrow, 10:00 - 12:00", "Tomorrow, 14:00 - 16:00", "Tomorrow, 16:00 - 18:00", "This week, flexible"];

function MeetupCard({ m }: { m: Meetup }) {
  const { toggleJoin } = useMeetups();
  const spotsLeft = m.max - m.attendees;
  const full = m.attendees >= m.max;

  return (
    <div className={`glass-card p-5 space-y-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${m.joined ? "border-primary/30" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm leading-tight">{m.topic}</h3>
          <Badge variant="outline" className="text-[10px]">{m.subject}</Badge>
        </div>
        <Badge variant={m.locationType === "online" ? "secondary" : "outline"} className="text-[10px] shrink-0 gap-1">
          {m.locationType === "online" ? <><Wifi className="h-2.5 w-2.5" /> Online</> : <><Building2 className="h-2.5 w-2.5" /> In-person</>}
        </Badge>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0" />{m.time}</div>
        <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" />{m.location}</div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 shrink-0" />
          <span>
            {m.attendees}/{m.max} attending · Hosted by <span className="text-foreground font-medium">{m.host}</span>
          </span>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${full ? "bg-destructive" : m.attendees / m.max > 0.7 ? "bg-warning" : "bg-success"}`}
            style={{ width: `${(m.attendees / m.max) * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">{full ? "Session full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining`}</p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          onClick={() => toggleJoin(m.id)}
          variant={m.joined ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs transition-all duration-300"
          disabled={!m.joined && full}
        >
          {m.joined ? "✓ Joined" : full ? "Full" : "Join Session"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={() => {
            const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(m.topic)}&details=${encodeURIComponent(`Study session at ${m.location}`)}&dates=&location=${encodeURIComponent(m.location)}`;
            window.open(calUrl, "_blank");
          }}
        >
          <Calendar className="h-3 w-3" /> Cal
        </Button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-5 w-24" /></div>
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="space-y-1.5"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-48" /></div>
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="flex gap-2 pt-1"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-16" /></div>
    </div>
  );
}

function CreateMeetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createMeetup, loading } = useMeetups();
  const { user } = useAuth();

  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [customTime, setCustomTime] = useState("");
  const [location, setLocation] = useState("");
  const [locationType, setLocationType] = useState<"in-person" | "online">("in-person");
  const [maxStr, setMaxStr] = useState("10");
  const [submitting, setSubmitting] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anonymous";

  const handleSubmit = async () => {
    if (!topic.trim() || !location.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await createMeetup({
      topic: topic.trim(),
      subject,
      time: customTime.trim() || time,
      location: location.trim(),
      locationType,
      max: Math.max(2, Math.min(50, parseInt(maxStr) || 10)),
      host: displayName,
    });
    toast({ title: "Meetup created! 🎉", description: "Other students can now join your session." });
    setSubmitting(false);
    setTopic(""); setLocation(""); setCustomTime("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Create Study Meetup
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Topic */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Session Topic *</label>
            <Input placeholder="e.g. Linear Algebra Final Prep" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject *</label>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${subject === s ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Location type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Format</label>
            <div className="flex gap-2">
              {(["in-person", "online"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLocationType(t)}
                  className={`flex-1 py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5 transition-all ${locationType === t ? "bg-primary/10 border-primary text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30"}`}
                >
                  {t === "online" ? <><Wifi className="h-3.5 w-3.5" /> Online</> : <><Building2 className="h-3.5 w-3.5" /> In-person</>}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{locationType === "online" ? "Meeting Link / Platform *" : "Location *"}</label>
            <Input
              placeholder={locationType === "online" ? "e.g. Zoom, Discord #study, Google Meet link" : "e.g. Library Room 4, Northern Building"}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time *</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTime(t); setCustomTime(""); }}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${time === t && !customTime ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Input placeholder="Or type custom time..." value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
          </div>

          {/* Max attendees */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Max Attendees</label>
            <div className="flex items-center gap-2">
              {[5, 10, 15, 20, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxStr(String(n))}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${maxStr === String(n) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
                >
                  {n}
                </button>
              ))}
              <Input
                type="number"
                min={2}
                max={100}
                value={maxStr}
                onChange={(e) => setMaxStr(e.target.value)}
                className="w-20 text-xs"
              />
            </div>
          </div>

          <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitting ? "Creating..." : "Create Meetup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Meetups() {
  const { meetups, loading } = useMeetups();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = meetups.filter(
    (m) => m.topic.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🤝 Meetups & Study Circles</h1>
          <p className="text-muted-foreground mt-1">Organize and join study sessions with ELTE students</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Meetup
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by topic or subject..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="joined">My Meetups ({filtered.filter((m) => m.joined).length})</TabsTrigger>
          <TabsTrigger value="online">Online ({filtered.filter((m) => m.locationType === "online").length})</TabsTrigger>
          <TabsTrigger value="inperson">In-person ({filtered.filter((m) => m.locationType === "in-person").length})</TabsTrigger>
        </TabsList>

        {([
          ["all", filtered],
          ["joined", filtered.filter((m) => m.joined)],
          ["online", filtered.filter((m) => m.locationType === "online")],
          ["inperson", filtered.filter((m) => m.locationType === "in-person")],
        ] as [string, Meetup[]][]).map(([tab, items]) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : items.length === 0 ? (
              <div className="glass-subtle rounded-xl p-12 text-center">
                <p className="text-4xl mb-3">🤝</p>
                <p className="font-medium">No meetups here yet</p>
                <p className="text-sm text-muted-foreground mt-1">Be the first to create a study session!</p>
                <Button className="mt-4 gap-2" size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Create Meetup
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((m) => <MeetupCard key={m.id} m={m} />)}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <CreateMeetupDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
