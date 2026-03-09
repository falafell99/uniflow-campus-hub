import { useState, useEffect } from "react";
import { Search, Star, ChevronDown, ChevronUp, ThumbsUp, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type DBProfessor = {
  id: number;
  name: string;
  department: string;
  subjects: string[];
};

type DBRating = {
  id: number;
  professor_id: number;
  student_name: string;
  overall: number;
  difficulty: number;
  clarity: number;
  comment: string | null;
  subject: string | null;
  created_at: string;
};

type ProfessorWithStats = DBProfessor & {
  avgRating: number;
  avgDifficulty: number;
  avgClarity: number;
  reviewCount: number;
  reviews: DBRating[];
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
      ))}
      <span className="text-sm font-semibold ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-5 w-5 cursor-pointer transition-colors ${s <= (hover || value) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        />
      ))}
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

function computeStats(reviews: DBRating[]): { avgRating: number; avgDifficulty: number; avgClarity: number } {
  if (reviews.length === 0) return { avgRating: 0, avgDifficulty: 0, avgClarity: 0 };
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    avgRating: avg(reviews.map((r) => r.overall)),
    avgDifficulty: avg(reviews.map((r) => r.difficulty)) * 20,
    avgClarity: avg(reviews.map((r) => r.clarity)) * 20,
  };
}

export default function ProfessorRadar() {
  const { user } = useAuth();
  const [professors, setProfessors] = useState<ProfessorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [ratingModal, setRatingModal] = useState<ProfessorWithStats | null>(null);

  // Rating form
  const [overall, setOverall] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [comment, setComment] = useState("");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: profs } = await supabase.from("professors").select("*");
    const { data: ratings } = await supabase.from("professor_ratings").select("*");

    if (profs) {
      const withStats: ProfessorWithStats[] = profs.map((p: DBProfessor) => {
        const profRatings = (ratings || []).filter((r: DBRating) => r.professor_id === p.id);
        const stats = computeStats(profRatings);
        return { ...p, ...stats, reviewCount: profRatings.length, reviews: profRatings };
      });
      setProfessors(withStats);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const submitRating = async () => {
    if (!ratingModal || overall === 0 || difficulty === 0 || clarity === 0) {
      toast({ title: "Please fill all star ratings", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anonymous";
    const { error } = await supabase.from("professor_ratings").insert({
      professor_id: ratingModal.id,
      student_id: user?.id,
      student_name: displayName,
      overall,
      difficulty,
      clarity,
      comment: comment || null,
      subject: subject || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error submitting rating", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Rating submitted! ⭐", description: "Thank you for helping other students." });
    setRatingModal(null);
    setOverall(0); setDifficulty(0); setClarity(0); setComment(""); setSubject("");
    loadData();
  };

  const filtered = professors.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">⭐ Professor Radar</h1>
          <p className="text-muted-foreground mt-1">Real ratings from ELTE students</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
          Live — {professors.reduce((a, p) => a + p.reviewCount, 0)} ratings
        </Badge>
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
                    <div className="flex gap-1.5"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-24" /></div>
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
                      <span className="text-sm font-bold text-primary">{p.name.split(" ").slice(-1)[0][0]}{p.name.split(" ").slice(-2)[0]?.[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{p.department}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {p.subjects.map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {p.reviewCount > 0 ? (
                          <><StarRating rating={p.avgRating} /><span className="text-[10px] text-muted-foreground">({p.reviewCount} reviews)</span></>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No ratings yet — be the first!</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expanded === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {expanded === p.id && (
                  <div className="mt-4 pt-4 border-t space-y-4 animate-fade-in">
                    {p.reviewCount > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        <GaugeBar label="Difficulty" value={Math.round(p.avgDifficulty)} color="bg-destructive/70" />
                        <GaugeBar label="Clarity" value={Math.round(p.avgClarity)} color="bg-success/70" />
                      </div>
                    )}

                    {/* Recent reviews */}
                    {p.reviews.slice(0, 3).map((r, i) => (
                      <div key={i} className="glass-subtle p-3 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-primary">{r.student_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
                            </div>
                            <span className="text-xs font-medium">{r.student_name}</span>
                            {r.subject && <Badge variant="outline" className="text-[10px] py-0">{r.subject}</Badge>}
                          </div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map((s) => <Star key={s} className={`h-3 w-3 ${s <= r.overall ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />)}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                      </div>
                    ))}

                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={(e) => { e.stopPropagation(); setRatingModal(p); }}
                    >
                      <Star className="h-3.5 w-3.5" /> Rate this professor
                    </Button>
                  </div>
                )}
              </div>
            ))}
      </div>

      {/* Rating submission dialog */}
      <Dialog open={!!ratingModal} onOpenChange={(open) => !open && setRatingModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-warning fill-warning" />
              Rate {ratingModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              {([["Overall", overall, setOverall], ["Difficulty (1=Easy, 5=Hard)", difficulty, setDifficulty], ["Clarity of Explanation", clarity, setClarity]] as [string, number, (v: number) => void][]).map(([label, val, setVal]) => (
                <div key={label} className="space-y-1">
                  <p className="text-sm font-medium">{label}</p>
                  <StarPicker value={val} onChange={setVal} />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Subject (optional)</p>
              <Input placeholder="e.g. Linear Algebra" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Comment (optional)</p>
              <Textarea placeholder="Share your experience, tips for other students..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            </div>
            <Button className="w-full gap-2" onClick={submitRating} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Rating
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
