import { Award, BookOpen, Users, MessageSquare, Settings, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/contexts/AppContext";

const badges = [
  { name: "STEM Gold Medalist", emoji: "🏅", earned: true },
  { name: "Top Contributor", emoji: "⭐", earned: true },
  { name: "Study Group Leader", emoji: "👑", earned: true },
  { name: "100 Uploads", emoji: "📤", earned: false },
  { name: "Forum Helper", emoji: "🤝", earned: true },
  { name: "Mentor", emoji: "🎓", earned: false },
];

const contributions = [
  { type: "upload", text: "Uploaded 'Calculus II Cheat Sheet'", time: "2 days ago" },
  { type: "forum", text: "Answered in 'BFS vs DFS' thread", time: "3 days ago" },
  { type: "meetup", text: "Hosted 'Linear Algebra Study Group'", time: "1 week ago" },
  { type: "upload", text: "Uploaded 'Discrete Math Graph Theory Notes'", time: "1 week ago" },
];

export default function Profile() {
  const { tutoringAvailable, setTutoringAvailable } = useApp();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">👤 Profile & Mentorship</h1>
        <Button variant="outline" size="sm" className="gap-1"><Settings className="h-3.5 w-3.5" /> Settings</Button>
      </div>

      {/* Profile Card */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-5">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">AK</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">Ahmed Kareem</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
            </div>
            <p className="text-sm text-muted-foreground">BSc Computer Science · Year 2 · Faculty of Informatics</p>
            <p className="text-sm mt-2">🏅 STEM Gold Medalist | Passionate about algorithms and AI. Always happy to help fellow students!</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> 47 resources shared</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> 128 forum posts</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 23 meetups attended</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tutoring Toggle */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Available for Tutoring</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Let other students know you can help with their courses</p>
        </div>
        <Switch checked={tutoringAvailable} onCheckedChange={setTutoringAvailable} />
      </div>

      {/* Badges */}
      <div className="glass-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Award className="h-5 w-5 text-primary" /> Badges</h3>
        <div className="grid grid-cols-3 gap-3">
          {badges.map((b) => (
            <div key={b.name} className={`glass-subtle p-3 text-center rounded-lg ${!b.earned ? "opacity-40 grayscale" : ""}`}>
              <span className="text-2xl">{b.emoji}</span>
              <p className="text-xs font-medium mt-1">{b.name}</p>
              {!b.earned && <p className="text-[10px] text-muted-foreground">Locked</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {contributions.map((c, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              <span className="flex-1">{c.text}</span>
              <span className="text-xs text-muted-foreground shrink-0">{c.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
