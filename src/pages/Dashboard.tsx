import { Calendar, Clock, MapPin, TrendingUp, BookOpen, Users, ArrowRight, FileText, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const upcomingMeetups = [
  { id: 1, topic: "Linear Algebra Study Group", time: "Today, 16:00", location: "Library Room 4", attendees: 8, maxAttendees: 12 },
  { id: 2, topic: "Algorithms Problem Set #7", time: "Tomorrow, 14:00", location: "Discord: #algo-study", attendees: 5, maxAttendees: 10 },
  { id: 3, topic: "Discrete Math Exam Prep", time: "Fri, 10:00", location: "Room 2-502, Northern Building", attendees: 15, maxAttendees: 20 },
];

const trendingResources = [
  { id: 1, title: "Calculus II Final Cheat Sheet", author: "Anna K.", downloads: 234, tag: "Exam Prep", tagClass: "badge-exam" },
  { id: 2, title: "Data Structures Lecture Notes (Golden)", author: "Márton B.", downloads: 189, tag: "Student Notes", tagClass: "badge-golden" },
  { id: 3, title: "Probability Theory Slides - Week 10", author: "Prof. Szabó", downloads: 156, tag: "Lecture Slides", tagClass: "badge-slides" },
  { id: 4, title: "Operating Systems Past Papers 2024", author: "Dániel T.", downloads: 142, tag: "Exam Prep", tagClass: "badge-exam" },
];

const quickSubjects = [
  { id: 1, name: "Linear Algebra", code: "GEIAL145", progress: 72, color: "bg-indigo-500" },
  { id: 2, name: "Algorithms & Data Structures", code: "GEIAL219", progress: 58, color: "bg-emerald-500" },
  { id: 3, name: "Discrete Mathematics", code: "GEIAL112", progress: 85, color: "bg-amber-500" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, Ahmed 👋</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening at ELTE Informatics today.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Meetups */}
          <section className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Upcoming Meetups
              </h2>
              <Button variant="ghost" size="sm" className="text-primary text-xs">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingMeetups.map((m) => (
                <div key={m.id} className="glass-subtle p-3.5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{m.topic}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{m.attendees}/{m.maxAttendees}</span>
                    <Button size="sm" className="h-7 text-xs">Joined ✓</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Trending Resources */}
          <section className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trending in Informatics
              </h2>
              <Button variant="ghost" size="sm" className="text-primary text-xs">
                Browse Vault <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {trendingResources.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium truncate">{r.title}</h3>
                    <p className="text-xs text-muted-foreground">by {r.author} · {r.downloads} downloads</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${r.tagClass}`}>{r.tag}</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick Access */}
          <section className="glass-card p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              My Subjects
            </h2>
            <div className="space-y-4">
              {quickSubjects.map((s) => (
                <div key={s.id} className="glass-subtle p-3.5 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">{s.name}</h3>
                    <span className="text-[10px] text-muted-foreground font-mono">{s.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={s.progress} className="flex-1 h-1.5" />
                    <span className="text-xs font-medium text-muted-foreground">{s.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="glass-card p-5">
            <h2 className="text-lg font-semibold mb-4">This Week</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Resources Viewed", value: "24", icon: FileText },
                { label: "Meetups Joined", value: "3", icon: Users },
                { label: "Forum Posts", value: "7", icon: Star },
                { label: "Study Hours", value: "18h", icon: Clock },
              ].map((stat) => (
                <div key={stat.label} className="glass-subtle p-3 text-center">
                  <stat.icon className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
