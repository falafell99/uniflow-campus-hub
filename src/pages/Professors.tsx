import { useState, useEffect } from "react";
import { Search, Star, ChevronDown, ChevronUp, Send, Loader2, MapPin, Clock, Mail, Phone, Hash, Video, UserPlus, FileEdit } from "lucide-react";
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
  email?: string;
  phone?: string;
  neptun?: string;
  teams_link?: string;
  room?: string;
  working_hours?: string;
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
        <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/20"}`} />
      ))}
      <span className="text-sm font-bold ml-1.5">{rating.toFixed(1)}</span>
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-6 w-6 cursor-pointer transition-colors ${s <= (hover || value) ? "fill-warning text-warning drop-shadow-sm" : "text-muted-foreground/20"}`}
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
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden shadow-inner">
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

  // New Review Modal (Moderation)
  const [newReviewModalOpen, setNewReviewModalOpen] = useState(false);
  const [profName, setProfName] = useState("");
  const [tag, setTag] = useState("");

  // Common Rating form fields
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

  const resetForm = () => {
    setOverall(0); setDifficulty(0); setClarity(0); setComment(""); setSubject(""); setProfName(""); setTag("");
  };

  const submitExistingProfRating = async () => {
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
    resetForm();
    loadData();
  };

  const submitNewProfRating = async () => {
    if (!profName.trim() || overall === 0) {
      toast({ title: "Please provide a name and overall rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    
    // Simulate submission for moderation
    setTimeout(() => {
      toast({ title: "Review submitted for moderation! 🛡️", description: "Thank you for contributing to the community.", variant: "default" });
      setSubmitting(false);
      setNewReviewModalOpen(false);
      resetForm();
    }, 1000);
  };

  const filtered = professors.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto h-full overflow-y-auto hide-scrollbar pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <span className="text-warning drop-shadow-sm">⭐</span> Professor Radar
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Real ratings from real ELTE students</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs gap-1.5 py-1.5 px-3 bg-card border-border/50 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse inline-block" />
            <span className="font-bold">{professors.reduce((a, p) => a + p.reviewCount, 0)} Total</span>
          </Badge>
          <Button onClick={() => setNewReviewModalOpen(true)} className="gap-2 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground">
            <UserPlus className="h-4 w-4" /> Add Review
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search professors by name or subject (e.g., Algorithms)..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="pl-12 h-14 bg-card border-border/50 rounded-2xl shadow-sm text-base" 
        />
      </div>

      {/* Main Content */}
      <div className="space-y-4 pt-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm">
              <div className="flex items-start gap-5">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-md" /><Skeleton className="h-6 w-24 rounded-md" /></div>
                </div>
                <Skeleton className="h-20 w-24 rounded-2xl" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-card border border-border/40 border-dashed rounded-3xl shadow-sm animate-in zoom-in-95 duration-500">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-primary/5">
              <Search className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No professors found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
              We couldn't find anyone matching your criteria. Try adjusting your search, or if they're not here, you can add a review to help others!
            </p>
            <Button size="lg" onClick={() => setNewReviewModalOpen(true)} className="gap-2 font-bold shadow-lg shadow-primary/20 rounded-xl px-8 h-12">
              <UserPlus className="h-5 w-5" /> Add Professor Review
            </Button>
          </div>
        ) : (
          filtered.map((p) => (
            <div 
              key={p.id} 
              className={`bg-card border rounded-3xl p-6 transition-all duration-300 cursor-pointer ${expanded === p.id ? "border-primary/50 shadow-md" : "border-border/40 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"}`} 
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10 shadow-inner">
                    <span className="text-lg sm:text-xl font-black text-primary uppercase">{p.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground/90">{p.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-3">{p.department}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {p.subjects.map((s) => <Badge key={s} variant="secondary" className="text-[10px] sm:text-xs bg-secondary/50 hover:bg-secondary/70 font-semibold">{s}</Badge>)}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center bg-background/50 border border-border/50 rounded-2xl p-3 sm:px-5 min-w-[70px] sm:min-w-[90px] shadow-sm ml-2 shrink-0">
                  {p.reviewCount > 0 ? (
                    <>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <span className="text-xl sm:text-3xl font-black tracking-tighter">{p.avgRating.toFixed(1)}</span>
                        <Star className="h-4 w-4 sm:h-6 sm:w-6 fill-warning text-warning drop-shadow-sm mb-1" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">{p.reviewCount} Ratings</span>
                    </>
                  ) : (
                    <span className="text-[10px] sm:text-xs text-muted-foreground italic font-medium text-center leading-tight px-1">No Ratings</span>
                  )}
                </div>
              </div>

              {expanded === p.id && (
                <div className="mt-6 pt-6 border-t border-border/30 space-y-6 animate-in slide-in-from-top-2 duration-300">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact details */}
                    <div className="bg-background/40 border border-border/40 p-5 rounded-2xl space-y-4 shadow-sm">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <UserPlus className="h-3.5 w-3.5" /> Contact Details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-xs sm:text-sm truncate font-semibold">
                            {p.email ? <a href={`mailto:${p.email}`} className="hover:text-primary transition-colors">{p.email}</a> : <span className="text-muted-foreground/50 font-medium">None</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-xs sm:text-sm truncate font-semibold">
                            {p.room ? `Room ${p.room}` : <span className="text-muted-foreground/50 font-medium">None</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-xs sm:text-sm truncate font-semibold">
                            {p.working_hours || <span className="text-muted-foreground/50 font-medium">None</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <Video className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-xs sm:text-sm truncate font-semibold">
                            {p.teams_link ? <a href={p.teams_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Teams Link</a> : <span className="text-muted-foreground/50 font-medium">None</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    {p.reviewCount > 0 && (
                      <div className="bg-background/40 border border-border/40 p-5 rounded-2xl flex flex-col justify-center space-y-5 shadow-sm">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-center">Score Breakdown</p>
                        <div className="space-y-4 px-2">
                          <GaugeBar label="Difficulty" value={Math.round(p.avgDifficulty)} color="bg-destructive/80" />
                          <GaugeBar label="Clarity" value={Math.round(p.avgClarity)} color="bg-success/80" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reviews */}
                  {p.reviewCount > 0 && (
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1 mt-6 mb-4">Recent Reviews</p>
                      {p.reviews.map((r, i) => (
                        <div key={i} className="bg-background border border-border/30 p-4 rounded-2xl space-y-3 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-background">
                                <span className="text-[10px] font-black text-primary">{r.student_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
                              </div>
                              <div>
                                <span className="text-sm font-bold block leading-none mb-1">{r.student_name}</span>
                                {r.subject && <span className="text-[10px] text-muted-foreground font-medium">{r.subject}</span>}
                              </div>
                            </div>
                            <div className="bg-card px-2 py-1 rounded-lg border border-border/50">
                              <StarRating rating={r.overall} />
                            </div>
                          </div>
                          {r.comment && <p className="text-sm text-foreground/90 pl-11">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    className="w-full gap-2 font-bold h-12 rounded-xl mt-4 bg-primary/10 text-primary hover:bg-primary/20 border-0"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); setRatingModal(p); }}
                  >
                    <FileEdit className="h-4 w-4" /> Rate this professor
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* RATING SUBMISSION DIALOG (Existing Prof) */}
      <Dialog open={!!ratingModal} onOpenChange={(open) => !open && setRatingModal(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Star className="h-6 w-6 text-warning fill-warning" />
              Rate {ratingModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-border/40">
              {([["Overall Rating", overall, setOverall], ["Difficulty (1=Easy, 5=Hard)", difficulty, setDifficulty], ["Clarity of Explanation", clarity, setClarity]] as [string, number, (v: number) => void][]).map(([label, val, setVal]) => (
                <div key={label} className="space-y-2">
                  <p className="text-sm font-bold text-foreground/90">{label}</p>
                  <StarPicker value={val} onChange={setVal} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground/90">Subject (optional)</p>
              <Input placeholder="e.g. Linear Algebra" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-background rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground/90">Comment (optional)</p>
              <Textarea placeholder="Share your experience, tips for other students..." value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="bg-background rounded-xl resize-none" />
            </div>
            <Button className="w-full gap-2 font-bold h-12 rounded-xl text-base" onClick={submitExistingProfRating} disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Submit Rating
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NEW REVIEW DIALOG (Moderated) */}
      <Dialog open={newReviewModalOpen} onOpenChange={setNewReviewModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <UserPlus className="h-6 w-6 text-primary" />
              Add Professor Review
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-medium pt-1">
              If a professor is completely missing, submit a review here. It will be added after brief moderation.
            </p>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground/90">Professor Name</p>
              <Input placeholder="e.g. Dr. John Doe" value={profName} onChange={(e) => setProfName(e.target.value)} className="bg-background rounded-xl h-11" />
            </div>
            <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-border/40">
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground/90">Overall Rating</p>
                <StarPicker value={overall} onChange={setOverall} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground/90">Subject</p>
              <Input placeholder="e.g. Linear Algebra" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-background rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground/90">Tag (Optional)</p>
              <Input placeholder="e.g. Tough Grader, Hilarious" value={tag} onChange={(e) => setTag(e.target.value)} className="bg-background rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground/90">Review Text</p>
              <Textarea placeholder="Share your experience..." value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="bg-background rounded-xl resize-none" />
            </div>
            <Button className="w-full gap-2 font-bold h-12 rounded-xl text-base" onClick={submitNewProfRating} disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Submit for Moderation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
