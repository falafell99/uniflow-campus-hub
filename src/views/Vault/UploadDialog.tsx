import { useState, useRef, DragEvent } from "react";
import { Upload, Loader2, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const SUBJECTS = [
  "General", "Calculus I", "Calculus II", "Linear Algebra",
  "Discrete Mathematics", "Algorithms", "Data Structures",
  "Probability & Statistics", "Operating Systems", "Computer Architecture",
  "Programming", "Databases", "Networks", "Artificial Intelligence",
];

const FILE_TYPES = [
  "Lecture Slides", "Exam Prep", "Student Notes",
  "Cheat Sheet", "Practice Problems", "Lab Report", "Other",
];

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export function UploadDialog({ open, onClose, onUploaded }: UploadDialogProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("General");
  const [fileType, setFileType] = useState("Student Notes");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pick = (f: File) => setFile(f);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  };

  const reset = () => {
    setFile(null);
    setSubject("General");
    setFileType("Student Notes");
    if (inputRef.current) inputRef.current.value = "";
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
      file_type: fileType,
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
      toast({ title: "File uploaded! 📁", description: `${file.name} added to ${subject}.` });
      reset();
      onUploaded();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Upload to The Vault
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
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
              accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.jpg,.jpeg,.png,.py,.js,.ts,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
            />
            {file ? (
              <div className="flex items-center gap-3 justify-center">
                <File className="h-8 w-8 text-primary shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-muted-foreground hover:text-destructive ml-auto shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, TXT, MD, images…</p>
              </>
            )}
          </div>

          {/* Subject picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Subject / Folder</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scroll">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                    subject === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* File type picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">File Type</label>
            <div className="flex flex-wrap gap-1.5">
              {FILE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFileType(t)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                    fileType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Upload button */}
          <Button
            className="w-full gap-2"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : `Upload to "${subject}"`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
