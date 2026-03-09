import { useState } from "react";
import { Search, Star, ExternalLink, ChevronDown, ChevronUp, X, ThumbsUp, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect } from "react";

type Professor = {
  id: number;
  name: string;
  department: string;
  subjects: string[];
  rating: number;
  difficulty: number;
  kindness: number;
  tips: string[];
  reviewCount: number;
  reviews: { author: string; date: string; text: string; rating: number; helpful: number }[];
};

const professors: Professor[] = [
  {
    id: 1, name: "Dr. Kovács László", department: "Algebra & Number Theory",
    subjects: ["Linear Algebra", "Abstract Algebra"], rating: 4.6, difficulty: 72, kindness: 88,
    tips: [
      "Focus on proofs in the textbook. He values logical reasoning over memorization.",
      "Office hours on Wednesdays are the least crowded.",
      "His exam questions often come from the problem sets — do all of them.",
      "Bring examples to office hours, he responds better to specific questions.",
    ],
    reviewCount: 89,
    reviews: [
      { author: "Bence M.", date: "Dec 2024", text: "Excellent lecturer. Explains concepts clearly and gives great examples. Exams are fair if you attend lectures.", rating: 5, helpful: 23 },
      { author: "Anna K.", date: "Nov 2024", text: "Very organized lectures. The problem sets are essential for the exam. He's strict but fair.", rating: 4, helpful: 15 },
      { author: "Dániel T.", date: "Oct 2024", text: "Best math professor at ELTE. His proofs are elegant and he makes algebra interesting.", rating: 5, helpful: 31 },
    ],
  },
  {
    id: 2, name: "Dr. Tóth Mária", department: "Analysis",
    subjects: ["Calculus I", "Calculus II"], rating: 4.2, difficulty: 85, kindness: 65,
    tips: [
      "Her exams are tough but fair. Practice all exercises from the problem sets.",
      "She gives partial credit generously.",
      "Don't skip lectures — she explains things that aren't in the textbook.",
      "Form a study group, her material is dense.",
    ],
    reviewCount: 124,
    reviews: [
      { author: "Eszter N.", date: "Dec 2024", text: "Challenging but rewarding course. She pushes you to really understand the material.", rating: 4, helpful: 18 },
      { author: "Gábor L.", date: "Nov 2024", text: "Very fast-paced lectures. You need to prepare before each class.", rating: 3, helpful: 12 },
    ],
  },
  {
    id: 3, name: "Dr. Szabó Péter", department: "Probability & Statistics",
    subjects: ["Probability Theory", "Mathematical Statistics"], rating: 4.8, difficulty: 60, kindness: 95,
    tips: [
      "One of the best lecturers. Attend every lecture — his explanations are clearer than any textbook.",
      "Very approachable during office hours.",
      "He gives bonus problems that can boost your grade.",
      "His slides are gold — download and annotate them.",
    ],
    reviewCount: 156,
    reviews: [
      { author: "Márton B.", date: "Dec 2024", text: "Absolutely amazing professor. Makes probability feel intuitive. 10/10 would recommend.", rating: 5, helpful: 42 },
      { author: "Ahmed K.", date: "Nov 2024", text: "Best professor I've had at ELTE. Patient, clear, and genuinely cares about students.", rating: 5, helpful: 38 },
    ],
  },
  {
    id: 4, name: "Dr. Nagy András", department: "Computer Science",
    subjects: ["Algorithms", "Data Structures"], rating: 3.9, difficulty: 90, kindness: 55,
    tips: [
      "Very strict grading. Make sure your code compiles before submission.",
      "His problem sets are harder than the exam.",
      "Study the textbook chapters he assigns — exam questions come from there.",
      "Don't be afraid to ask questions, despite his stern demeanor he respects curiosity.",
    ],
    reviewCount: 98,
    reviews: [
      { author: "Bence M.", date: "Dec 2024", text: "Tough but you'll learn a lot. His course prepared me well for coding interviews.", rating: 4, helpful: 22 },
      { author: "Anna K.", date: "Oct 2024", text: "Strict grading but clear expectations. Read the syllabus carefully.", rating: 3, helpful: 9 },
    ],
  },
  {
    id: 5, name: "Dr. Fehér Katalin", department: "Discrete Mathematics",
    subjects: ["Discrete Math", "Graph Theory"], rating: 4.4, difficulty: 68, kindness: 82,
    tips: [
      "She loves when students participate in class. Bonus points for solving challenge problems.",
      "Study groups are highly recommended.",
      "Her graph theory examples are key for the exam.",
      "Visit her office hours at least once — she remembers engaged students.",
    ],
    reviewCount: 72,
    reviews: [
      { author: "Dániel T.", date: "Nov 2024", text: "Great professor who makes discrete math fun. Lots of interactive examples.", rating: 5, helpful: 16 },
      { author: "Eszter N.", date: "Oct 2024", text: "Fair exams and engaging lectures. One of the more approachable professors.", rating: 4, helpful: 11 },
    ],
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
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
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ProfessorRadar() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reviewModal, setReviewModal] = useState<Professor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

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
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-32" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </div>
            ))
          : filtered.map((p) => (
              <div key={p.id} className="glass-card p-5 transition-all duration-300">
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
                  <div className="mt-4 pt-4 border-t space-y-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4">
                      <GaugeBar label="Difficulty" value={p.difficulty} color="bg-destructive/70" />
                      <GaugeBar label="Kindness" value={p.kindness} color="bg-success/70" />
                    </div>

                    {/* Student Tips Feed */}
                    <div className="glass-subtle p-4 rounded-lg space-y-2.5">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">💡 Student Tips — How to Pass</p>
                      {p.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5 text-xs">•</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>

                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={(e) => { e.stopPropagation(); setReviewModal(p); }}>
                      <ExternalLink className="h-3 w-3" /> View on RateMyTeacher
                    </Button>
                  </div>
                )}
              </div>
            ))}
      </div>

      {/* RateMyTeacher Modal */}
      <Dialog open={!!reviewModal} onOpenChange={(open) => !open && setReviewModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-warning fill-warning" />
              {reviewModal?.name} — Reviews
            </DialogTitle>
          </DialogHeader>
          {reviewModal && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 glass-subtle p-3 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{reviewModal.rating.toFixed(1)}</p>
                  <StarRating rating={reviewModal.rating} />
                  <p className="text-[10px] text-muted-foreground mt-1">{reviewModal.reviewCount} reviews</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  <GaugeBar label="Difficulty" value={reviewModal.difficulty} color="bg-destructive/70" />
                  <GaugeBar label="Kindness" value={reviewModal.kindness} color="bg-success/70" />
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {reviewModal.reviews.map((r, i) => (
                  <div key={i} className="glass-subtle p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary">{r.author.split(" ").map(n => n[0]).join("")}</span>
                        </div>
                        <span className="text-xs font-medium">{r.author}</span>
                        <span className="text-[10px] text-muted-foreground">{r.date}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm">{r.text}</p>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" /> {r.helpful} found this helpful
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
