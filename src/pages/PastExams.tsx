import { useState, useEffect } from "react";
import { FileText, Download, Search, Upload, Loader2, ExternalLink, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type Exam = {
  id: number;
  title: string;
  subject: string;
  professor: string;
  year: number;
  exam_type: string;
  difficulty: string;
  downloads: number;
  uploader: string;
  storage_path: string | null;
  created_at: string;
};

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Very Hard"];
const EXAM_TYPES = ["Final", "Midterm", "Quiz", "Practice", "Retake"];
const SUBJECTS = ["Calculus I", "Calculus II", "Linear Algebra", "Algorithms", "Data Structures", "Discrete Math", "Probability Theory", "Operating Systems", "Databases", "Other"];
const PROFESSORS = ["Prof. Tóth", "Prof. Kovács", "Prof. Nagy", "Prof. Szabó", "Prof. Varga", "Other"];

const difficultyColor: Record<string, string> = {
  Easy: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Hard: "bg-destructive/10 text-destructive border-destructive/20",
  "Very Hard": "bg-destructive/20 text-destructive border-destructive/30",
};

const difficultyEmoji: Record<string, string> = {
  Easy: "🟢", Medium: "🟡", Hard: "🔴", "Very Hard": "💀",
};

// Static seed data (shown if DB empty, also used to populate DB on first visit)
const seedExams = [
  { title: "Calculus I Final 2024", subject: "Calculus I", professor: "Prof. Tóth", year: 2024, exam_type: "Final", difficulty: "Hard", downloads: 342, uploader: "Admin", storage_path: null },
  { title: "Calculus I Midterm 2024", subject: "Calculus I", professor: "Prof. Tóth", year: 2024, exam_type: "Midterm", difficulty: "Medium", downloads: 289, uploader: "Admin", storage_path: null },
  { title: "Linear Algebra Final 2024", subject: "Linear Algebra", professor: "Prof. Kovács", year: 2024, exam_type: "Final", difficulty: "Hard", downloads: 415, uploader: "Admin", storage_path: null },
  { title: "Discrete Math Final 2023", subject: "Discrete Math", professor: "Prof. Szabó", year: 2023, exam_type: "Final", difficulty: "Medium", downloads: 267, uploader: "Admin", storage_path: null },
  { title: "Algorithms Final 2023", subject: "Algorithms", professor: "Prof. Nagy", year: 2023, exam_type: "Final", difficulty: "Very Hard", downloads: 523, uploader: "Admin", storage_path: null },
  { title: "Algorithms Midterm 2022", subject: "Algorithms", professor: "Prof. Nagy", year: 2022, exam_type: "Midterm", difficulty: "Medium", downloads: 198, uploader: "Admin", storage_path: null },
  { title: "Linear Algebra Final 2021", subject: "Linear Algebra", professor: "Prof. Kovács", year: 2021, exam_type: "Final", difficulty: "Hard", downloads: 301, uploader: "Admin", storage_path: null },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

// ─── Upload Dialog ─────────────────────────────────────────────────────────────
function UploadDialog({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: (e: Exam) => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [professor, setProfessor] = useState(PROFESSORS[0]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [examType, setExamType] = useState(EXAM_TYPES[0]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!title.trim()) { toast({ title: "Please enter a title", variant: "destructive" }); return; }
    setUploading(true);
    const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anonymous";

    let storagePath: string | null = null;
    if (file) {
      const path = `exams/${user?.id}/${Date.now()}_${file.name}`;
      const { error: storErr } = await supabase.storage.from("vault").upload(path, file);
      if (!storErr) storagePath = path;
    }

    const { data, error } = await supabase.from("past_exams").insert({
      title: title.trim(),
      subject,
      professor,
      year: parseInt(year),
      exam_type: examType,
      difficulty,
      downloads: 0,
      uploader: displayName,
      uploader_id: user?.id,
      storage_path: storagePath,
    }).select().single();

    setUploading(false);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Exam uploaded! 📝", description: "Thanks for contributing to the community." });
    onUploaded(data as Exam);
    setTitle(""); setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Upload Past Exam
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <Input placeholder="e.g. Calculus I Final 2025" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Year</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[2025,2024,2023,2022,2021,2020,2019].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Professor</label>
              <Select value={professor} onValueChange={setProfessor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROFESSORS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${difficulty === d ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>
                  {difficultyEmoji[d]} {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">PDF File (optional)</label>
            <label className="flex items-center gap-2 px-3 py-2 border border-border/40 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Choose PDF or image..."}
              <input type="file" className="hidden" accept=".pdf,.jpg,.png,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <Button className="w-full gap-2" onClick={handleUpload} disabled={uploading || !title.trim()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Upload Exam"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PastExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [profFilter, setProfFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const loadExams = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("past_exams").select("*").order("year", { ascending: false }).order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      setExams(data as Exam[]);
    } else {
      // Seed starter data
      const { data: seeded } = await supabase.from("past_exams").insert(seedExams).select();
      if (seeded) setExams(seeded as Exam[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadExams(); }, []);

  const handleDownload = async (exam: Exam) => {
    // Increment download counter
    await supabase.from("past_exams").update({ downloads: exam.downloads + 1 }).eq("id", exam.id);
    setExams((prev) => prev.map((e) => e.id === exam.id ? { ...e, downloads: e.downloads + 1 } : e));

    if (exam.storage_path) {
      const { data } = await supabase.storage.from("vault").createSignedUrl(exam.storage_path, 60);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } else {
      toast({ title: "No file attached", description: "This exam was uploaded without a file." });
    }
  };

  const years = [...new Set(exams.map((e) => e.year))].sort((a, b) => b - a);
  const professors = [...new Set(exams.map((e) => e.professor))];
  const subjects = [...new Set(exams.map((e) => e.subject))];

  const filtered = exams.filter((e) => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.subject.toLowerCase().includes(search.toLowerCase())) return false;
    if (yearFilter !== "all" && e.year !== Number(yearFilter)) return false;
    if (profFilter !== "all" && e.professor !== profFilter) return false;
    if (subjectFilter !== "all" && e.subject !== subjectFilter) return false;
    if (difficultyFilter !== "all" && e.difficulty !== difficultyFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📝 Past Exams Hub</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading..." : `${exams.length} exams from ELTE students`} — contribute yours!
          </p>
        </div>
        <Button className="gap-2" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" /> Upload Exam
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search exams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={profFilter} onValueChange={setProfFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Professor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Professors</SelectItem>
            {professors.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Difficulty</SelectItem>
            {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{difficultyEmoji[d]} {d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {exams.length} exams
          {(yearFilter !== "all" || profFilter !== "all" || subjectFilter !== "all" || difficultyFilter !== "all" || search) && (
            <button onClick={() => { setSearch(""); setYearFilter("all"); setProfFilter("all"); setSubjectFilter("all"); setDifficultyFilter("all"); }}
              className="ml-2 text-primary hover:underline">Clear filters</button>
          )}
        </p>
      )}

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64" /></div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText className="h-10 w-10 mx-auto opacity-30" />
            <p className="font-medium">No exams found</p>
            <p className="text-sm text-muted-foreground">Try adjusting filters or upload a new exam</p>
            <Button size="sm" className="gap-2 mt-2" onClick={() => setUploadOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Upload Exam
            </Button>
          </div>
        ) : (
          filtered.map((exam) => (
            <div key={exam.id} className="glass-card p-4 flex items-center gap-4 hover:shadow-md transition-all duration-300 group">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium">{exam.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {exam.professor} · {exam.subject} · {exam.year} ·{" "}
                  <Badge variant="outline" className="text-[10px] py-0 px-1">{exam.exam_type}</Badge>
                  {" "}· {exam.downloads} downloads · uploaded by {exam.uploader}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-[10px] ${difficultyColor[exam.difficulty]}`}>
                  {difficultyEmoji[exam.difficulty]} {exam.difficulty}
                </Badge>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDownload(exam)}
                  title={exam.storage_path ? "Download" : "No file attached"}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={(e) => setExams((p) => [e, ...p])} />
    </div>
  );
}
