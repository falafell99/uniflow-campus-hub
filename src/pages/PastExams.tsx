import { useState } from "react";
import { FileText, Download, Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const exams = [
  { id: 1, title: "Calculus I Final 2024", professor: "Prof. Tóth", year: 2024, difficulty: "Hard", subject: "Calculus I", downloads: 342 },
  { id: 2, title: "Calculus I Midterm 2024", professor: "Prof. Tóth", year: 2024, difficulty: "Medium", subject: "Calculus I", downloads: 289 },
  { id: 3, title: "Linear Algebra Final 2024", professor: "Prof. Kovács", year: 2024, difficulty: "Hard", subject: "Linear Algebra", downloads: 415 },
  { id: 4, title: "Discrete Math Final 2023", professor: "Prof. Szabó", year: 2023, difficulty: "Medium", subject: "Discrete Math", downloads: 267 },
  { id: 5, title: "Algorithms Final 2023", professor: "Prof. Nagy", year: 2023, difficulty: "Very Hard", subject: "Algorithms", downloads: 523 },
  { id: 6, title: "Algorithms Midterm 2022", professor: "Prof. Nagy", year: 2022, difficulty: "Medium", subject: "Algorithms", downloads: 198 },
  { id: 7, title: "Discrete Math Final 2022", professor: "Prof. Szabó", year: 2022, difficulty: "Easy", subject: "Discrete Math", downloads: 156 },
  { id: 8, title: "Linear Algebra Final 2021", professor: "Prof. Kovács", year: 2021, difficulty: "Hard", subject: "Linear Algebra", downloads: 301 },
  { id: 9, title: "Calculus I Final 2020", professor: "Prof. Tóth", year: 2020, difficulty: "Medium", subject: "Calculus I", downloads: 178 },
];

const difficultyColor: Record<string, string> = {
  Easy: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Hard: "bg-destructive/10 text-destructive border-destructive/20",
  "Very Hard": "bg-destructive/20 text-destructive border-destructive/30",
};

export default function PastExams() {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [profFilter, setProfFilter] = useState("all");

  const filtered = exams.filter((e) => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (yearFilter !== "all" && e.year !== Number(yearFilter)) return false;
    if (profFilter !== "all" && e.professor !== profFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📝 Past Exams Hub</h1>
        <p className="text-muted-foreground mt-1">Exam papers from 2020–2025, categorized by difficulty and professor.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search exams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {[2024, 2023, 2022, 2021, 2020].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={profFilter} onValueChange={setProfFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Professor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Professors</SelectItem>
            {[...new Set(exams.map((e) => e.professor))].map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((exam) => (
          <div
            key={exam.id}
            className="glass-card p-4 flex items-center gap-4 hover:shadow-md transition-all duration-300 cursor-pointer group animate-fade-in"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium">{exam.title}</h3>
              <p className="text-xs text-muted-foreground">{exam.professor} · {exam.subject} · {exam.downloads} downloads</p>
            </div>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${difficultyColor[exam.difficulty]}`}>{exam.difficulty}</Badge>
            <div className="hidden group-hover:flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground animate-fade-in">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No exams match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
