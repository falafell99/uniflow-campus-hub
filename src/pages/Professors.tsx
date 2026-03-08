import { useState } from "react";
import { Search, Star, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const professors = [
  {
    id: 1, name: "Dr. Kovács László", department: "Algebra & Number Theory",
    subjects: ["Linear Algebra", "Abstract Algebra"], rating: 4.6, difficulty: 72, kindness: 88,
    tips: "Focus on proofs in the textbook. He values logical reasoning over memorization. Office hours on Wednesdays are the least crowded.",
    reviewCount: 89,
  },
  {
    id: 2, name: "Dr. Tóth Mária", department: "Analysis",
    subjects: ["Calculus I", "Calculus II"], rating: 4.2, difficulty: 85, kindness: 65,
    tips: "Her exams are tough but fair. Practice all exercises from the problem sets. She gives partial credit generously.",
    reviewCount: 124,
  },
  {
    id: 3, name: "Dr. Szabó Péter", department: "Probability & Statistics",
    subjects: ["Probability Theory", "Mathematical Statistics"], rating: 4.8, difficulty: 60, kindness: 95,
    tips: "One of the best lecturers. Attend every lecture — his explanations are clearer than any textbook. Very approachable during office hours.",
    reviewCount: 156,
  },
  {
    id: 4, name: "Dr. Nagy András", department: "Computer Science",
    subjects: ["Algorithms", "Data Structures"], rating: 3.9, difficulty: 90, kindness: 55,
    tips: "Very strict grading. Make sure your code compiles before submission. His problem sets are harder than the exam.",
    reviewCount: 98,
  },
  {
    id: 5, name: "Dr. Fehér Katalin", department: "Discrete Mathematics",
    subjects: ["Discrete Math", "Graph Theory"], rating: 4.4, difficulty: 68, kindness: 82,
    tips: "She loves when students participate in class. Bonus points for solving challenge problems. Study groups are highly recommended.",
    reviewCount: 72,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
      <span className="text-sm font-semibold ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function GaugeBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ProfessorRadar() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = professors.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">⭐ Professor Radar</h1>
        <p className="text-muted-foreground mt-1">Find the right professor for your courses</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or subject..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="glass-card p-5">
            <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{p.name.split(" ").slice(-1)[0][0]}{p.name.split(" ").slice(-2)[0][0]}</span>
                </div>
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.department}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    {p.subjects.map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                  </div>
                  <div className="mt-2">
                    <StarRating rating={p.rating} />
                    <span className="text-[10px] text-muted-foreground ml-1">({p.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {expanded === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>

            {expanded === p.id && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <GaugeBar label="Difficulty" value={p.difficulty} color="bg-red-400" />
                  <GaugeBar label="Kindness" value={p.kindness} color="bg-emerald-400" />
                </div>
                <div className="glass-subtle p-3 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">💡 How to pass</p>
                  <p className="text-sm">{p.tips}</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <ExternalLink className="h-3 w-3" /> View on RateMyTeacher
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
