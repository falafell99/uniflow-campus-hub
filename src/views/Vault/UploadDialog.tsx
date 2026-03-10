import { useState, useRef, DragEvent } from "react";
import { Upload, Loader2, File, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// ─── ELTE Computer Science BSc Curriculum ─────────────────────────────────────
export const SEMESTER_COURSES: Record<number, string[]> = {
  1: [
    "Basic Mathematics",
    "Computer Systems",
    "Programming",
    "Imperative Programming",
    "Functional Programming",
    "Learning Methodology",
    "Business Fundamentals",
  ],
  2: [
    "Analysis I",
    "Discrete Mathematics I",
    "Algorithms and Data Structures I",
    "Programming Languages",
    "Object-Oriented Programming",
    "Web Development",
  ],
  3: [
    "Analysis II",
    "Discrete Mathematics — Application of Discrete Models",
    "Algorithms and Data Structures II",
    "Programming Technology",
    "Web Programming",
  ],
  4: [
    "Numerical Methods",
    "Fundamentals of Theory of Computation I",
    "Databases I",
    "Software Technology",
    "Operating Systems",
  ],
  5: [
    "Probability and Statistics",
    "Fundamentals of Theory of Computation II",
    "Artificial Intelligence",
    "Databases II",
    "Telecommunication Networks",
    "Concurrent Programming",
  ],
  6: [
    "Thesis Consultation",
  ],
};

export const ELECTIVE_COURSES = [
  "GPU Programming",
  "Cryptography and Security",
  "Introduction to Machine Learning",
  "Programming Theory",
  "Tools of Software Projects",
  "Compilers",
  "ADA",
  "Python",
  "Applied Data Science",
  "Cybersecurity Basic",
  "Computer Graphics",
  "Intermediate Computer Graphics",
  "Native Cloud Computing Applications",
  "Advanced Web Programming",
];

export const SECTIONS = [
  { id: "Lectures",     emoji: "📖", desc: "Lecture slides & notes" },
  { id: "Practices",   emoji: "💡", desc: "Practice session materials" },
  { id: "Labs",        emoji: "🔬", desc: "Laboratory work" },
  { id: "Exams",       emoji: "📝", desc: "Past exams & solutions" },
  { id: "Homeworks",   emoji: "📋", desc: "Homework assignments" },
  { id: "Projects",    emoji: "🧩", desc: "Project files & reports" },
  { id: "Notes",       emoji: "📌", desc: "Personal & shared notes" },
  { id: "Cheat Sheets",emoji: "🗒️", desc: "Quick reference sheets" },
  { id: "Past Papers", emoji: "📂", desc: "Previous year materials" },
  { id: "Other",       emoji: "📁", desc: "Miscellaneous files" },
];

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

type Step = "semester" | "subject" | "section" | "file";

export function UploadDialog({ open, onClose, onUploaded }: UploadDialogProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("semester");
  const [semester, setSemester] = useState<number | "elective">(1);
  const [subject, setSubject] = useState("");
  const [section, setSection] = useState("Lectures");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const semesterNum = semester === "elective" ? 0 : semester;
  const subjectList = semester === "elective" ? ELECTIVE_COURSES : (SEMESTER_COURSES[semester] ?? []);

  const reset = () => {
    setStep("semester");
    setSemester(1);
    setSubject("");
    setSection("Lectures");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);

    const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Anonymous";
    const path = `${user.id}/${Date.now()}_${file.name}`;

    const { error: storageErr } = await supabase.storage.from("vault").upload(path, file);
    if (storageErr) console.warn("Storage upload failed:", storageErr.message);

    const { error: dbErr } = await supabase.from("vault_files").insert({
      name: file.name,
      subject,
      section,
      semester: semesterNum,
      file_type: section, // keep legacy compat
      storage_path: storageErr ? null : path,
      file_size: file.size,
      uploader: displayName,
      uploader_id: user.id,
      downloads: 0,
      stars: 0,
    });

    setUploading(false);
    if (dbErr) {
      toast({ title: "Upload failed", description: dbErr.message, variant: "destructive" });
    } else {
      const where = semester === "elective" ? `Electives / ${subject}` : `Semester ${semester} / ${subject}`;
      toast({ title: "Uploaded! 📁", description: `${file.name} → ${where} / ${section}` });
      reset();
      onUploaded();
      onClose();
    }
  };

  const breadcrumb = [
    semester !== 1 || step !== "semester" ? (semester === "elective" ? "Electives" : `Semester ${semester}`) : null,
    subject || null,
    section !== "Lectures" || step === "section" ? section : null,
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Upload to The Vault
          </DialogTitle>
        </DialogHeader>

        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
            <span className="text-foreground font-medium">📚 Vault</span>
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>{b}</span>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {/* Step 1: Semester */}
          {step === "semester" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">1. Choose Semester</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSemester(s); setStep("subject"); }}
                    className="flex flex-col items-center p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all gap-1"
                  >
                    <span className="text-xl">📅</span>
                    <span className="text-xs font-semibold">Semester {s}</span>
                    <span className="text-[10px] text-muted-foreground">{SEMESTER_COURSES[s].length} courses</span>
                  </button>
                ))}
                <button
                  onClick={() => { setSemester("elective"); setStep("subject"); }}
                  className="flex flex-col items-center p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all gap-1 col-span-3"
                >
                  <span className="text-xl">⭐</span>
                  <span className="text-xs font-semibold">Elective Courses</span>
                  <span className="text-[10px] text-muted-foreground">{ELECTIVE_COURSES.length} courses</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Subject */}
          {step === "subject" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">2. Choose Subject</p>
                <button onClick={() => setStep("semester")} className="text-xs text-primary hover:underline">← Back</button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto custom-scroll pr-1">
                {subjectList.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSubject(s); setStep("section"); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left border border-border/30 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <span className="text-base">📘</span>
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Section */}
          {step === "section" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">3. Choose Section</p>
                <button onClick={() => setStep("subject")} className="text-xs text-primary hover:underline">← Back</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => { setSection(sec.id); setStep("file"); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left border transition-all ${
                      section === sec.id ? "border-primary bg-primary/10" : "border-border/30 hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <span>{sec.emoji}</span>
                    <div>
                      <p className="text-xs font-medium">{sec.id}</p>
                      <p className="text-[10px] text-muted-foreground">{sec.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: File */}
          {step === "file" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">4. Upload File</p>
                <button onClick={() => setStep("section")} className="text-xs text-primary hover:underline">← Back</button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.jpg,.jpeg,.png,.py,.js,.ts,.csv,.zip"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
                />
                {file ? (
                  <div className="flex items-center gap-3 justify-center">
                    <File className="h-8 w-8 text-primary shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-muted-foreground hover:text-destructive ml-auto shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Drop file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, TXT, images, .py, .zip…</p>
                  </>
                )}
              </div>

              <Button className="w-full gap-2" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : `Upload to ${section}`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
