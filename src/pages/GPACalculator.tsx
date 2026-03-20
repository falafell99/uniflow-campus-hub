import { useState, useMemo, useEffect } from "react";
import { Check, X, Calculator, Save, GraduationCap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ELTE_CURRICULUM: Record<number, any> = {
  1: {
    label: "Semester 1",
    credits: 29,
    subjects: [
      { name: "Computer Systems", code: "IP-18fSZGREG", credits: 5, type: "compulsory" },
      { name: "Programming", code: "IP-18fPROGEG", credits: 6, type: "compulsory" },
      { name: "Imperative Programming", code: "IP-18fIMPROGEG", credits: 5, type: "compulsory" },
      { name: "Functional Programming", code: "IP-18fFUNPEG", credits: 5, type: "compulsory" },
      { name: "Basic Mathematics", code: "IP-18fMATAG", credits: 4, type: "compulsory" },
      { name: "Learning Methodology", code: "IP-18fTMKG", credits: 1, type: "compulsory" },
      { name: "Business Fundamentals", code: "IP-18fIVMEG", credits: 3, type: "compulsory" },
    ]
  },
  2: {
    label: "Semester 2",
    credits: 30,
    subjects: [
      { name: "Programming Languages", code: "IP-18fPNYEG", credits: 6, type: "compulsory" },
      { name: "Object-oriented Programming", code: "IP-18fOEPROGEG", credits: 6, type: "compulsory" },
      { name: "Web Development", code: "IP-18fWF1EG", credits: 3, type: "compulsory" },
      { name: "Algorithms and Data Structures I (lecture)", code: "IP-18fAA1E", credits: 2, type: "compulsory" },
      { name: "Algorithms and Data Structures I (practice)", code: "IP-18fAA1G", credits: 3, type: "compulsory" },
      { name: "Discrete Mathematics I (lecture)", code: "IP-18fDM1E", credits: 2, type: "compulsory" },
      { name: "Discrete Mathematics I (practice)", code: "IP-18fDM1G", credits: 3, type: "compulsory" },
      { name: "Analysis I (lecture)", code: "IP-18fAN1E", credits: 2, type: "compulsory" },
      { name: "Analysis I (practice)", code: "IP-18fAN1G", credits: 3, type: "compulsory" },
    ]
  },
  3: {
    label: "Semester 3",
    credits: 31,
    subjects: [
      { name: "Algorithms and Data Structures II (lecture)", code: "IP-18fAA2E", credits: 2, type: "compulsory" },
      { name: "Algorithms and Data Structures II (practice)", code: "IP-18fAA2G", credits: 3, type: "compulsory" },
      { name: "Web Programming", code: "IP-18fWPEG", credits: 4, type: "compulsory" },
      { name: "Programming Technology", code: "IP-18fPROGTEG", credits: 5, type: "compulsory" },
      { name: "Analysis II (lecture)", code: "IP-18fAN2E", credits: 2, type: "compulsory" },
      { name: "Analysis II (practice)", code: "IP-18fAN2G", credits: 3, type: "compulsory" },
      { name: "Application of Discrete Models", code: "IP-18fDMAG", credits: 3, type: "compulsory" },
    ]
  },
  4: {
    label: "Semester 4",
    credits: 30,
    subjects: [
      { name: "Operating Systems", code: "IP-18fOPREG", credits: 3, type: "compulsory" },
      { name: "Databases I (lecture)", code: "IP-18fAB1E", credits: 2, type: "compulsory" },
      { name: "Databases I (practice)", code: "IP-18fAB1G", credits: 2, type: "compulsory" },
      { name: "Software Technology", code: "IP-18fSZTEG", credits: 5, type: "compulsory" },
      { name: "Fundamentals of Theory of Computation I (lecture)", code: "IP-18fSZEA1E", credits: 2, type: "compulsory" },
      { name: "Fundamentals of Theory of Computation I (practice)", code: "IP-18fSZEA1G", credits: 3, type: "compulsory" },
      { name: "Numerical Methods (lecture)", code: "IP-18fNM1E", credits: 2, type: "compulsory" },
      { name: "Numerical Methods (practice)", code: "IP-18fNM1G", credits: 3, type: "compulsory" },
    ]
  },
  5: {
    label: "Semester 5",
    credits: 30,
    subjects: [
      { name: "Concurrent Programming", code: "IP-18fKPROGEG", credits: 3, type: "compulsory" },
      { name: "Telecommunication Networks (lecture)", code: "IP-18fTKHE", credits: 2, type: "compulsory" },
      { name: "Telecommunication Networks (practice)", code: "IP-18fTKHG", credits: 3, type: "compulsory" },
      { name: "Artificial Intelligence", code: "IP-18fMIAE", credits: 3, type: "compulsory" },
      { name: "Databases II (lecture)", code: "IP-18fAB2E", credits: 2, type: "compulsory" },
      { name: "Databases II (practice)", code: "IP-18fAB2G", credits: 3, type: "compulsory" },
      { name: "Fundamentals of Theory of Computation II (lecture)", code: "IP-18fSZEA2E", credits: 2, type: "compulsory" },
      { name: "Fundamentals of Theory of Computation II (practice)", code: "IP-18fSZEA2G", credits: 3, type: "compulsory" },
      { name: "Probability and Statistics", code: "IP-18fVSZG", credits: 3, type: "compulsory" },
    ]
  },
  6: {
    label: "Semester 6",
    credits: 30,
    subjects: [] // Thesis + electives
  }
};

const ELECTIVE_SUBJECTS = [
  { name: "Hungarian Language and Culture I", code: "IP-MID1MAGY", credits: 4 },
  { name: "Hungarian Language and Culture II", code: "IP-MID2MAGY", credits: 4 },
  { name: "GPU Programming", code: "IP-18fKVGPUEG", credits: 3 },
  { name: "Cryptography and Security", code: "IP-18fKVKRBE+G", credits: 5 },
  { name: "Introduction to Machine Learning", code: "IP-18fKVBGTE", credits: 3 },
  { name: "Programming Theory", code: "IP-18fKVPREE+G", credits: 5 },
  { name: "Tools of Software Projects", code: "IP-18KVPRJG", credits: 3 },
  { name: "Compilers", code: "IP-18fKVFPE+G", credits: 5 },
  { name: "ADA", code: "IP-18fKVADA", credits: 5 },
  { name: "Python", code: "IP-18fKVPYEG", credits: 5 },
  { name: "Applied Data Science", code: "IP-18fKVIADSE", credits: 2 },
  { name: "Cybersecurity Basic", code: "IP-24fKVSZKBIZTE", credits: 4 },
  { name: "Computer Graphics", code: "IP-24fKVSZGE+G", credits: 6 },
  { name: "Intermediate Computer Graphics", code: "IP-24fKVKHSZGG", credits: 3 },
  { name: "Native Cloud Computing Applications", code: "IP-24fKVNFIAEG", credits: 5 },
  { name: "Advanced Web Programming", code: "IP-24fKVHWPEG", credits: 5 },
];

const ELTE_GRADES = [
  { label: "5 (Excellent)", points: 5, gpa4: 4.0 },
  { label: "4 (Good)", points: 4, gpa4: 3.0 },
  { label: "3 (Satisfactory)", points: 3, gpa4: 2.0 },
  { label: "2 (Pass)", points: 2, gpa4: 1.0 },
  { label: "1 (Fail)", points: 1, gpa4: 0.0 },
  { label: "Fail (F)", points: 0, gpa4: 0.0 },
  { label: "Dropped", points: 0, gpa4: 0, isDropped: true },
];

type Course = {
  name: string;
  code: string;
  credits: number;
  grade: string;
  type: string;
};

type SavedSemester = {
  semester: number;
  gpa: string;
  credits: number;
  courses: Course[];
};

export default function GPACalculator() {
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showElectives, setShowElectives] = useState(false);
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [savedSemesters, setSavedSemesters] = useState<SavedSemester[]>([]);

  useEffect(() => {
    // Basic load for initially saved semesters
    const saved = [];
    for (let i = 1; i <= 6; i++) {
        const data = localStorage.getItem(`elte-gpa-semester-${i}`);
        if (data) {
            saved.push(JSON.parse(data));
        }
    }
    setSavedSemesters(saved);
  }, []);

  const loadSemester = (sem: number) => {
    setSelectedSemester(sem);
    const savedData = localStorage.getItem(`elte-gpa-semester-${sem}`);
    
    if (savedData) {
        const parsed = JSON.parse(savedData);
        setCourses(parsed.courses);
        setShowElectives(parsed.courses.some((c: Course) => c.type === "elective"));
        setSelectedElectives(parsed.courses.filter((c: Course) => c.type === "elective").map((c: Course) => c.code));
    } else {
        const curriculum = ELTE_CURRICULUM[sem];
        setCourses(curriculum.subjects.map((s: any) => ({
          name: s.name,
          code: s.code,
          credits: s.credits,
          grade: "5 (Excellent)",
          type: s.type
        })));
        setShowElectives(false);
        setSelectedElectives([]);
    }
  };

  useEffect(() => {
    if (courses.length === 0) loadSemester(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleElective = (code: string) => {
    if (selectedElectives.includes(code)) {
      setSelectedElectives(prev => prev.filter(c => c !== code));
    } else {
      setSelectedElectives(prev => [...prev, code]);
    }
  };

  const removeElective = (code: string) => {
    setSelectedElectives(prev => prev.filter(c => c !== code));
  };

  const allCourses = useMemo(() => {
    const core = courses.filter(c => c.type !== "elective");
    const electivesList = selectedElectives.map(code => {
      const matchingSaved = courses.find(c => c.code === code);
      if (matchingSaved) return matchingSaved;
      const el = ELECTIVE_SUBJECTS.find(e => e.code === code)!;
      return {
        name: el.name,
        code: el.code,
        credits: el.credits,
        grade: "5 (Excellent)",
        type: "elective"
      };
    });
    return [...core, ...electivesList];
  }, [courses, selectedElectives]);

  const updateGrade = (index: number, val: string) => {
    const newCourses = allCourses.map((c, i) => i === index ? { ...c, grade: val } : c);
    setCourses(newCourses);
  };

  const calculatedGPA = useMemo(() => {
    const valid = allCourses.filter(c => c.credits > 0);
    if (!valid.length) return { weighted: "0.00", unweighted: "0.00", creditIndex: "0.00", totalCredits: 0, passedCredits: 0 };
    
    const coursesForGPA = valid.filter(c => c.grade !== "Dropped");
    
    const totalWeightedPoints = coursesForGPA.reduce((sum, c) => {
      const grade = ELTE_GRADES.find(g => g.label === c.grade);
      return sum + (grade?.points || 0) * c.credits;
    }, 0);
    
    const totalUnweightedPoints = coursesForGPA.reduce((sum, c) => {
      const grade = ELTE_GRADES.find(g => g.label === c.grade);
      return sum + (grade?.points || 0);
    }, 0);
    
    const totalCreditsForGPA = coursesForGPA.reduce((sum, c) => sum + c.credits, 0);
    const totalCredits = valid.reduce((sum, c) => sum + c.credits, 0);
    const passedCredits = valid.filter(c => !c.grade.startsWith("1") && !c.grade.startsWith("Fail") && c.grade !== "Dropped").reduce((sum, c) => sum + c.credits, 0);
    
    const weighted = totalCreditsForGPA > 0 ? (totalWeightedPoints / totalCreditsForGPA).toFixed(2) : "0.00";
    const unweighted = coursesForGPA.length > 0 ? (totalUnweightedPoints / coursesForGPA.length).toFixed(2) : "0.00";
    const creditIndex = (totalWeightedPoints / 30).toFixed(2);
    
    return { weighted, unweighted, creditIndex, totalCredits, passedCredits };
  }, [allCourses]);

  const getHungarianLabel = (gpa: string) => {
    const n = parseFloat(gpa);
    if (n >= 4.51) return "🌟 Excellent (Kitűnő)";
    if (n >= 3.51) return "✅ Good (Jó)";
    if (n >= 2.51) return "👍 Satisfactory (Közepes)";
    if (n >= 1.51) return "⚠️ Pass (Elégséges)";
    return "❌ Fail (Elégtelen)";
  };

  const saveCurrentSemester = () => {
    const data = {
      semester: selectedSemester,
      gpa: calculatedGPA.weighted,
      credits: calculatedGPA.totalCredits,
      courses: allCourses
    };
    localStorage.setItem(`elte-gpa-semester-${selectedSemester}`, JSON.stringify(data));
    toast.success(`Semester ${selectedSemester} saved locally!`);
    
    setSavedSemesters(prev => {
      const filtered = prev.filter(p => p.semester !== selectedSemester);
      return [...filtered, data].sort((a,b) => a.semester - b.semester);
    });
  };

  const overallGPA = useMemo(() => {
    if (!savedSemesters.length) return "0.00";
    let totalPts = 0;
    let totalCr = 0;
    savedSemesters.forEach(s => {
      s.courses.forEach(c => {
        const grade = ELTE_GRADES.find(g => g.label === c.grade);
        totalPts += (grade?.points || 0) * c.credits;
        totalCr += c.credits;
      });
    });
    if (totalCr === 0) return "0.00";
    return (totalPts / totalCr).toFixed(2);
  }, [savedSemesters]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12 pt-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            GPA Calculator
          </h1>
          <p className="text-muted-foreground mt-1">
            ELTE Computer Science BSc Curriculum
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1 */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-bold">Which semester are you calculating?</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[1,2,3,4,5,6].map(sem => (
                <button key={sem}
                  onClick={() => loadSemester(sem)}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${
                    selectedSemester === sem
                      ? "border-primary bg-primary/10"
                      : "border-border/40 hover:border-border"
                  }`}>
                  <p className="text-2xl font-black">{sem}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{ELTE_CURRICULUM[sem].credits || 30} cr.</p>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2 */}
          <div className="flex items-center justify-between p-4 bg-card border border-border/40 rounded-2xl mb-4">
            <div>
              <p className="font-semibold text-sm">Include Elective Subjects?</p>
              <p className="text-xs text-muted-foreground">Add compulsory elective courses for this semester</p>
            </div>
            <Switch checked={showElectives} onCheckedChange={setShowElectives} />
          </div>

          {showElectives && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }}
              className="bg-card border border-border/40 rounded-2xl p-4 mb-4 space-y-3 overflow-hidden"
            >
              <p className="text-sm font-semibold">Select your elective subjects:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll pr-2">
                {ELECTIVE_SUBJECTS.map(elective => (
                  <div key={elective.code}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedElectives.includes(elective.code)
                        ? "border-primary bg-primary/5"
                        : "border-border/30 hover:border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => toggleElective(elective.code)}>
                    <div className="flex items-center gap-3">
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                        selectedElectives.includes(elective.code)
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}>
                        {selectedElectives.includes(elective.code) && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="text-sm font-medium">{elective.name}</span>
                    </div>
                    <span className="text-xs font-semibold whitespace-nowrap">{elective.credits} cr.</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3 */}
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 bg-muted/5">
              <div className="col-span-6 md:col-span-7">Subject</div>
              <div className="col-span-2 text-center">Credits</div>
              <div className="col-span-3 md:col-span-2">Grade</div>
              <div className="col-span-1 border-border border-0"></div>
            </div>
            
            {allCourses.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                    No subjects in this semester. Make sure to add thesis or electives.
                </div>
            )}
            
            {allCourses.map((course, i) => (
              <div key={i} className={`grid grid-cols-12 gap-2 px-3 sm:px-4 py-3 items-center border-b border-border/10 last:border-0 ${course.type === "elective" ? "bg-primary/[0.02]" : ""}`}>
                <div className="col-span-6 md:col-span-7">
                  <p className="text-xs sm:text-sm font-semibold leading-snug break-words" title={course.name}>{course.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-[9px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{course.code}</p>
                    {course.type === "elective" && (
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium border border-primary/20">Elective</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-sm font-bold bg-muted/50 px-2.5 py-1 rounded-md">{course.credits}</span>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <select
                    value={course.grade}
                    onChange={e => updateGrade(i, e.target.value)}
                    className={`w-full text-xs font-semibold rounded-lg px-2 py-1.5 border outline-none transition-colors cursor-pointer appearance-none ${
                      course.grade === "Dropped" ? "bg-muted/30 border-border/50 text-muted-foreground" :
                      course.grade.startsWith("5") ? "bg-green-500/10 border-green-500/20 text-green-500" :
                      course.grade.startsWith("4") ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                      course.grade.startsWith("3") ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                      course.grade.startsWith("2") ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
                      "bg-red-500/10 border-red-500/20 text-red-500"
                    }`}
                  >
                    {ELTE_GRADES.map(g => <option key={g.label} value={g.label} className="bg-background text-foreground block">{g.label.split(" ").slice(0, 1)} {g.label.split(" ").slice(1).join(" ")}</option>)}
                  </select>
                </div>
                <div className="col-span-1 flex justify-end">
                  {course.type === "elective" && (
                    <button onClick={() => removeElective(course.code)} className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {allCourses.length > 0 && (
            <div className="flex justify-end pt-2">
                <Button onClick={saveCurrentSemester} className="gap-2 shadow-md shadow-primary/20 bg-primary/10 text-primary hover:bg-primary/20 border-0" variant="outline">
                <Save className="h-4 w-4" /> Save Semester {selectedSemester}
                </Button>
            </div>
          )}

        </div>

        <div className="space-y-6">
          {/* RESULTS CARD */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm sticky top-24">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> Term Overview
            </h3>
            <div className="flex flex-col gap-3 mb-6">
              {/* Main Weighted GPA Card */}
              <div className="text-center p-4 bg-primary/10 rounded-2xl border-2 border-primary/20 shadow-sm shadow-primary/5">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Weighted GPA (Kitűnő)</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-4xl font-black text-primary drop-shadow-md tracking-tighter">{calculatedGPA.weighted}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold bg-muted/50 px-2 py-0.5 rounded-full">{getHungarianLabel(calculatedGPA.weighted).split(" ")[0]}</p>
                </div>
              </div>

              {/* Unweighted Card */}
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl border border-border/40">
                <div className="text-left">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Unweighted</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Traditional Avg</p>
                </div>
                <p className="text-2xl font-black text-foreground/80 tracking-tighter">{calculatedGPA.unweighted}</p>
              </div>

              {/* Credit Index Card */}
              <div className="flex flex-col p-3 bg-muted/30 rounded-2xl border border-border/50 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Credit Index</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Σ(Grade×Cr) / 30</p>
                  </div>
                  <p className="text-2xl font-black text-success tracking-tighter">{calculatedGPA.creditIndex}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-border/20">
                  <p className="text-[8px] leading-tight text-muted-foreground italic">
                    Note: Divided by 30 (std. load). Can be &lt; 5.0 for {`<`}30 cr, or &gt; 5.0 with extra electives.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-border/30">
              <div className="text-center flex flex-col items-center justify-center p-2 rounded-xl bg-background border border-border/30">
                <p className="text-xl font-black">{calculatedGPA.totalCredits}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Total Cr.</p>
              </div>
              <div className="text-center flex flex-col items-center justify-center p-2 rounded-xl bg-background border border-border/30">
                <p className="text-xl font-black text-success">{calculatedGPA.passedCredits}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Passed</p>
              </div>
              <div className="text-center flex flex-col items-center justify-center p-2 rounded-xl bg-background border border-border/30">
                <p className="text-xl font-black text-foreground/80">{allCourses.length}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Subjects</p>
              </div>
            </div>
            
            {/* CUMULATIVE GPA section */}
            {savedSemesters.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border/30">
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                        Cumulative Record
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full normal-case tracking-normal">{savedSemesters.length} Saved</span>
                    </h3>
                    <div className="space-y-3">
                        {savedSemesters.map(s => (
                            <div key={s.semester} className="flex items-center justify-between bg-muted/20 px-3 py-2.5 rounded-xl border border-border/50">
                                <span className="text-sm font-semibold flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-md bg-background border flex items-center justify-center text-xs">S{s.semester}</span>
                                </span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-muted/50 rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full bg-primary rounded-full" style={{ width: `${(parseFloat(s.gpa) / 5) * 100}%` }} />
                                    </div>
                                    <span className="text-sm font-black w-8 text-right">{s.gpa}</span>
                                    <button onClick={() => {
                                        const nextSaved = savedSemesters.filter(x => x.semester !== s.semester);
                                        localStorage.removeItem(`elte-gpa-semester-${s.semester}`);
                                        setSavedSemesters(nextSaved);
                                        toast.info(`Deleted Semester ${s.semester}`);
                                    }} className="text-muted-foreground hover:text-destructive opacity-50 hover:opacity-100 transition-opacity ml-1">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-4 mt-2">
                            <span className="text-base font-bold text-foreground/80">Overall GPA</span>
                            <span className="text-2xl font-black text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 shadow-sm">{overallGPA}</span>
                        </div>
                    </div>
                </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
