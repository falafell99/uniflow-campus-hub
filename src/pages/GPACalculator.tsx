import { useState, useMemo } from "react";
import { GraduationCap, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Course = { name: string; grade: string; credits: number };
type SavedSemester = { name: string; gpa: string; courses: Course[] };

const getGradeOptions = (scale: string) => {
  if (scale === "4.0 Scale") return [
    { label: "A+", points: 4.0 }, { label: "A", points: 4.0 }, { label: "A-", points: 3.7 },
    { label: "B+", points: 3.3 }, { label: "B", points: 3.0 }, { label: "B-", points: 2.7 },
    { label: "C+", points: 2.3 }, { label: "C", points: 2.0 }, { label: "C-", points: 1.7 },
    { label: "D", points: 1.0 }, { label: "F", points: 0.0 },
  ];
  if (scale === "5.0 Scale") return [
    { label: "5", points: 5 }, { label: "4", points: 4 }, { label: "3", points: 3 },
    { label: "2", points: 2 }, { label: "1", points: 1 },
  ];
  if (scale === "10.0 Scale") return Array.from({ length: 10 }, (_, i) => ({ label: String(10 - i), points: 10 - i }));
  return [
    { label: "90-100%", points: 4.0 }, { label: "80-89%", points: 3.0 },
    { label: "70-79%", points: 2.0 }, { label: "60-69%", points: 1.0 }, { label: "Below 60%", points: 0 },
  ];
};

const getGPALabel = (gpa: string) => {
  const n = parseFloat(gpa);
  if (n >= 3.7) return "🌟 Excellent — Dean's List territory";
  if (n >= 3.0) return "✅ Good standing";
  if (n >= 2.0) return "⚠️ Satisfactory";
  return "❌ Below average — time to focus";
};

export default function GPACalculator() {
  const [gradeScale, setGradeScale] = useState("4.0 Scale");
  const [courses, setCourses] = useState<Course[]>([
    { name: "", grade: "A", credits: 3 },
    { name: "", grade: "A", credits: 3 },
    { name: "", grade: "B", credits: 3 },
    { name: "", grade: "B", credits: 3 },
  ]);
  const [semesterName, setSemesterName] = useState("");
  const [savedSemesters, setSavedSemesters] = useState<SavedSemester[]>(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("gpa-"));
      return keys.map(k => JSON.parse(localStorage.getItem(k)!)).filter(Boolean);
    } catch { return []; }
  });

  const updateCourse = (i: number, field: keyof Course, value: string | number) => {
    setCourses(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };
  const addCourse = () => setCourses(prev => [...prev, { name: "", grade: getGradeOptions(gradeScale)[0].label, credits: 3 }]);
  const removeCourse = (i: number) => setCourses(prev => prev.filter((_, idx) => idx !== i));

  const calculatedGPA = useMemo(() => {
    const validCourses = courses.filter(c => c.credits > 0);
    if (validCourses.length === 0) return "0.00";
    const totalPoints = validCourses.reduce((sum, c) => {
      const gradeOption = getGradeOptions(gradeScale).find(g => g.label === c.grade);
      return sum + (gradeOption?.points || 0) * c.credits;
    }, 0);
    const totalCreds = validCourses.reduce((sum, c) => sum + c.credits, 0);
    return (totalPoints / totalCreds).toFixed(2);
  }, [courses, gradeScale]);

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);

  const highestGrade = useMemo(() => {
    const options = getGradeOptions(gradeScale);
    let best = "";
    let bestPoints = -1;
    for (const c of courses) {
      const opt = options.find(g => g.label === c.grade);
      if (opt && opt.points > bestPoints) { bestPoints = opt.points; best = opt.label; }
    }
    return best || "-";
  }, [courses, gradeScale]);

  const saveSemester = () => {
    if (!semesterName.trim()) { toast.error("Enter a semester name"); return; }
    const sem: SavedSemester = { name: semesterName.trim(), gpa: calculatedGPA, courses: [...courses] };
    localStorage.setItem(`gpa-${semesterName.trim()}`, JSON.stringify(sem));
    setSavedSemesters(prev => [...prev.filter(s => s.name !== sem.name), sem]);
    toast.success("Semester saved!");
    setSemesterName("");
  };

  const loadSemester = (sem: SavedSemester) => {
    setCourses(sem.courses);
    toast.success(`Loaded "${sem.name}"`);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">GPA Calculator</h1>
          <p className="text-sm text-muted-foreground">Calculate your semester and cumulative GPA</p>
        </div>
      </div>

      {/* Grade Scale */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["4.0 Scale", "5.0 Scale", "10.0 Scale", "Percentage"].map(scale => (
          <button key={scale} onClick={() => setGradeScale(scale)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${gradeScale === scale ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}>
            {scale}
          </button>
        ))}
      </div>

      {/* Courses Table */}
      <div className="bg-card border border-border/40 rounded-2xl overflow-hidden mb-4">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 bg-muted/5">
          <div className="col-span-5">Course name</div>
          <div className="col-span-3">Grade</div>
          <div className="col-span-3">Credits</div>
          <div className="col-span-1"></div>
        </div>
        {courses.map((course, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center border-b border-border/10 last:border-0">
            <div className="col-span-5">
              <Input value={course.name} onChange={e => updateCourse(i, "name", e.target.value)}
                placeholder="e.g. Linear Algebra" className="h-8 text-sm bg-transparent border-border/30" />
            </div>
            <div className="col-span-3">
              <select value={course.grade} onChange={e => updateCourse(i, "grade", e.target.value)}
                className="w-full h-8 text-sm bg-background border border-border/30 rounded-md px-2 outline-none">
                {getGradeOptions(gradeScale).map(g => (
                  <option key={g.label} value={g.label}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <Input type="number" min={1} max={10} value={course.credits}
                onChange={e => updateCourse(i, "credits", Number(e.target.value))}
                className="h-8 text-sm bg-transparent border-border/30" />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeCourse(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addCourse} className="w-full gap-2 mb-6">
        <Plus className="h-4 w-4" /> Add Course
      </Button>

      {/* GPA Result */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center mb-6">
        <p className="text-sm text-muted-foreground mb-2">Your GPA</p>
        <p className="text-6xl font-black text-primary">{calculatedGPA}</p>
        <p className="text-sm text-muted-foreground mt-2">{getGPALabel(calculatedGPA)}</p>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-primary/10">
          <div>
            <p className="text-2xl font-bold">{totalCredits}</p>
            <p className="text-xs text-muted-foreground">Total Credits</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{courses.length}</p>
            <p className="text-xs text-muted-foreground">Courses</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{highestGrade}</p>
            <p className="text-xs text-muted-foreground">Best Grade</p>
          </div>
        </div>
      </div>

      {/* Save Semester */}
      <div className="flex gap-2 mt-4 mb-6">
        <Input placeholder="Semester name (e.g. Fall 2025)" value={semesterName} onChange={e => setSemesterName(e.target.value)} className="h-9" />
        <Button variant="outline" onClick={saveSemester} className="h-9 px-4 shrink-0">Save</Button>
      </div>

      {savedSemesters.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Saved Semesters</h3>
          {savedSemesters.map(sem => (
            <div key={sem.name} className="flex items-center justify-between p-3 bg-card border border-border/40 rounded-xl">
              <span className="text-sm font-medium">{sem.name}</span>
              <span className="text-primary font-bold">GPA: {sem.gpa}</span>
              <Button variant="ghost" size="sm" onClick={() => loadSemester(sem)}>Load</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
