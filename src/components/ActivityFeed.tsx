import { Users, Upload, BookOpen } from "lucide-react";

const activeStudiers = [
  { name: "Márton B.", subject: "Linear Algebra", avatar: "MB" },
  { name: "Eszter N.", subject: "Algorithms", avatar: "EN" },
  { name: "Anna K.", subject: "Probability", avatar: "AK" },
  { name: "Gábor L.", subject: "Operating Systems", avatar: "GL" },
];

const activeGroups = [
  { name: "Calculus Final Prep", members: 8, emoji: "📐" },
  { name: "Algo Problem Set", members: 5, emoji: "💻" },
  { name: "Discrete Math Grind", members: 3, emoji: "🧮" },
];

const recentUploads = [
  { file: "Eigenvalue Proofs Summary", subject: "Linear Algebra", time: "5m ago" },
  { file: "Week 12 Lecture Notes", subject: "Calculus II", time: "23m ago" },
  { file: "Past Exam 2024 Solutions", subject: "Algorithms", time: "1h ago" },
];

export function ActivityFeed() {
  return (
    <div className="w-[240px] shrink-0 border-l border-border/40 bg-background/60 backdrop-blur-xl overflow-y-auto hidden xl:flex flex-col">
      {/* Active Study Groups */}
      <div className="p-3 border-b border-border/30">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Users className="h-3 w-3" /> Active Study Groups
        </h3>
        <div className="space-y-1.5">
          {activeGroups.map((g) => (
            <div key={g.name} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
              <span className="text-sm">{g.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{g.name}</p>
                <p className="text-[10px] text-muted-foreground">{g.members} studying</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-success" />
            </div>
          ))}
        </div>
      </div>

      {/* Who's Studying Now */}
      <div className="p-3 border-b border-border/30">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" /> Studying Now
        </h3>
        <div className="space-y-1.5">
          {activeStudiers.map((s) => (
            <div key={s.name} className="flex items-center gap-2 px-1 py-1">
              <div className="relative">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-primary">{s.avatar}</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-background" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{s.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.subject}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Uploads */}
      <div className="p-3">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Upload className="h-3 w-3" /> New Uploads
        </h3>
        <div className="space-y-1.5">
          {recentUploads.map((u) => (
            <div key={u.file} className="px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
              <p className="text-xs font-medium truncate">{u.file}</p>
              <p className="text-[10px] text-muted-foreground">{u.subject} · {u.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
