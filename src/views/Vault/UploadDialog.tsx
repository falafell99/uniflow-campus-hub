import { useState, useRef, DragEvent } from "react";
import { Upload, Loader2, File as FileIcon, X, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { motion } from "framer-motion";

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
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, "pending" | "uploading" | "done" | "error">>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const semesterNum = semester === "elective" ? 0 : semester;
  const subjectList = semester === "elective" ? ELECTIVE_COURSES : (SEMESTER_COURSES[semester] ?? []);

  const reset = () => {
    setStep("semester");
    setSemester(1);
    setSubject("");
    setSection("Lectures");
    setFiles([]);
    setUploadProgress({});
    setUploadStatus({});
    setIsSubmitting(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > 10) {
      toast.error("Maximum 10 files allowed at once.");
      return;
    }
    const newFiles = [...files, ...selected].slice(0, 10);
    setFiles(newFiles);
    
    const progress: Record<string, number> = { ...uploadProgress };
    const status: Record<string, "pending" | "uploading" | "done" | "error"> = { ...uploadStatus };
    newFiles.forEach(f => {
      if (!status[f.name]) {
        progress[f.name] = 0;
        status[f.name] = "pending";
      }
    });
    setUploadProgress(progress);
    setUploadStatus(status);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (isSubmitting) return;
    
    const dropped = Array.from(e.dataTransfer.files);
    if (files.length + dropped.length > 10) {
      toast.error("Maximum 10 files allowed at once.");
      return;
    }
    const newFiles = [...files, ...dropped].slice(0, 10);
    setFiles(newFiles);
    
    const progress: Record<string, number> = { ...uploadProgress };
    const status: Record<string, "pending" | "uploading" | "done" | "error"> = { ...uploadStatus };
    newFiles.forEach(f => {
      if (!status[f.name]) {
        progress[f.name] = 0;
        status[f.name] = "pending";
      }
    });
    setUploadProgress(progress);
    setUploadStatus(status);
  };

  const handleUpload = async () => {
    if (!files.length || !user) return;
    setIsSubmitting(true);
    const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Anonymous";

    let errors = 0;

    const uploadFile = async (file: File) => {
      try {
        setUploadStatus(prev => ({ ...prev, [file.name]: "uploading" }));
        
        const cleanFileName = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9.-]/g, "_")
          .replace(/_{2,}/g, "_");
          
        const path = `${user.id}/${Date.now()}_${cleanFileName}`;
        
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min((prev[file.name] || 0) + 15, 90)
          }));
        }, 200);

        const { error: storageError } = await supabase.storage.from("vault").upload(path, file);
        clearInterval(progressInterval);
        
        if (storageError) throw storageError;

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        const { error: dbErr } = await supabase.from("vault_files").insert({
          name: file.name,
          subject,
          section,
          semester: semesterNum,
          file_type: section, // keeping legacy compat
          storage_path: path,
          uploader: displayName,
          uploader_id: user.id,
          file_size: file.size,
          downloads: 0,
          stars: 0,
          is_public: isPublic,
        });

        if (dbErr) throw dbErr;

        setUploadStatus(prev => ({ ...prev, [file.name]: "done" }));
        logActivity("file_uploaded", subject);

      } catch (e: any) {
        setUploadStatus(prev => ({ ...prev, [file.name]: "error" }));
        console.error(`Failed to upload ${file.name}:`, e.message);
        errors++;
      }
    };

    await Promise.all(files.map(uploadFile));

    if (errors === 0) {
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully!`);
      setTimeout(() => {
        onClose();
        reset();
        onUploaded();
      }, 800);
    } else {
      toast.error(`${errors} file(s) failed to upload`);
    }
    
    setIsSubmitting(false);
  };

  const breadcrumb = [
    semester !== 1 || step !== "semester" ? (semester === "elective" ? "Electives" : `Semester ${semester}`) : null,
    subject || null,
    section !== "Lectures" || step === "section" ? section : null,
  ].filter(Boolean);

  const overallProgress = files.length > 0
    ? Math.round(Object.values(uploadProgress).reduce((sum, p) => sum + p, 0) / files.length)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> 
            {files.length > 0 ? `Upload Files (${files.length} selected)` : "Upload to The Vault"}
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">4. Upload Files (Max 10)</p>
                <button onClick={() => !isSubmitting && setStep("section")} className="text-xs text-primary hover:underline" disabled={isSubmitting}>← Back</button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isSubmitting && inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                } ${
                  dragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.md,.py,.js,.ts,.zip,.csv"
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                />
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, TXT, images, code...</p>
              </div>

              {/* File list preview */}
              {files.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1">
                  {files.map(f => (
                    <div key={f.name} className="flex items-center gap-3 p-2.5 bg-muted/20 border border-border/30 rounded-xl">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm shrink-0">
                        📄
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-[11px] text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      {uploadStatus[f.name] === "done" && <Check className="h-4 w-4 text-green-400 shrink-0" />}
                      {uploadStatus[f.name] === "error" && <X className="h-4 w-4 text-red-500 shrink-0" />}
                      {uploadStatus[f.name] === "uploading" && (
                        <div className="w-16">
                          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress[f.name]}%` }} />
                          </div>
                        </div>
                      )}
                      {uploadStatus[f.name] === "pending" && !isSubmitting && (
                        <button onClick={(e) => {
                            e.stopPropagation();
                            setFiles(prev => prev.filter(file => file.name !== f.name));
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Overall Progress */}
              {isSubmitting && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>Uploading {files.length} files...</span>
                    <span>{overallProgress}%</span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${overallProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted/10 border border-border/30 rounded-xl">
                <div>
                  <p className="text-sm font-medium">Share with community</p>
                  <p className="text-xs text-muted-foreground">Other students can see and download this file</p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <Button className="w-full gap-2 font-bold" onClick={handleUpload} disabled={!files.length || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isSubmitting ? `Uploading ${files.length} files...` : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
