import { useState } from "react";
import { Upload, Loader2, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BADGE_CONFIG } from "@/constants/theme";
import { type FileItem } from "./FileTree";

type UploadStage = "form" | "uploading" | "indexing" | "done";

interface UploadDialogProps {
  onFileAdded: (file: FileItem) => void;
}

const FOLDER_MAP: Record<string, string> = {
  "linear-algebra": "11",
  calculus: "4",
  "discrete-math": "8",
  algorithms: "15",
};

export function UploadDialog({ onFileAdded }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<UploadStage>("form");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [folder, setFolder] = useState("linear-algebra");
  const [tag, setTag] = useState("student-notes");

  const reset = () => {
    setStage("form");
    setProgress(0);
    setFileName("");
    setOpen(false);
  };

  const handleUpload = () => {
    if (!fileName.trim()) return;
    setStage("uploading");
    setProgress(0);

    const uploadInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(uploadInterval);
          setStage("indexing");
          let idx = 0;
          const indexInterval = setInterval(() => {
            idx += 8;
            setProgress(idx);
            if (idx >= 100) {
              clearInterval(indexInterval);
              setStage("done");
              const cfg = BADGE_CONFIG[tag] ?? BADGE_CONFIG["student-notes"];
              const newFile: FileItem = {
                id: `new-${Date.now()}`,
                name: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
                type: "file",
                tag: cfg.tag,
                tagClass: cfg.tagClass,
                author: "Ahmed K.",
                date: new Date().toISOString().split("T")[0],
                downloads: 0,
                isNew: true,
              };
              onFileAdded(newFile);
            }
          }, 120);
          return 100;
        }
        return p + 5;
      });
    }, 80);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" /> Upload Resource
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a Resource</DialogTitle>
        </DialogHeader>

        {stage === "form" && (
          <div className="space-y-4 pt-4">
            <Input
              placeholder="File title (e.g. Eigenvalue Summary Notes)"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear-algebra">Linear Algebra</SelectItem>
                <SelectItem value="calculus">Calculus I</SelectItem>
                <SelectItem value="discrete-math">Discrete Mathematics</SelectItem>
                <SelectItem value="algorithms">Algorithms & Data Structures</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger>
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student-notes">Student Notes (Golden)</SelectItem>
                <SelectItem value="exam-prep">Exam Prep</SelectItem>
                <SelectItem value="lecture-slides">Lecture Slides</SelectItem>
              </SelectContent>
            </Select>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm">Drag & drop your file here, or click to browse</p>
              <p className="text-xs mt-1">PDF, DOCX, PPTX up to 50MB</p>
            </div>
            <Button className="w-full" onClick={handleUpload} disabled={!fileName.trim()}>
              Upload
            </Button>
          </div>
        )}

        {stage === "uploading" && (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Uploading file...</p>
              <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {stage === "indexing" && (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <Search className="h-3.5 w-3.5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Processing & Indexing...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Extracting text, tagging, and building search index
              </p>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-success" /> File uploaded successfully
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-primary" /> Extracting text content...
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-50">
                <div className="h-3 w-3" /> Building AI search index...
              </div>
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="py-8 space-y-4 text-center">
            <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Check className="h-7 w-7 text-success" />
            </div>
            <div>
              <p className="font-semibold">Upload Complete!</p>
              <p className="text-sm text-muted-foreground mt-1">
                "{fileName}" has been added to the vault and indexed for search.
              </p>
            </div>
            <Button onClick={reset} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
