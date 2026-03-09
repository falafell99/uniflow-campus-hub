import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, Folder, FileText, Upload, Search, Filter, Download, Eye, Check, Loader2, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

type FileItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  tag?: string;
  tagClass?: string;
  author?: string;
  date?: string;
  downloads?: number;
  isNew?: boolean;
  children?: FileItem[];
};

const initialVaultData: FileItem[] = [
  {
    id: "1", name: "Faculty of Informatics", type: "folder", children: [
      {
        id: "2", name: "BSc Computer Science", type: "folder", children: [
          {
            id: "3", name: "Year 1", type: "folder", children: [
              {
                id: "4", name: "Calculus I", type: "folder", children: [
                  { id: "5", name: "Final Exam Solutions 2024.pdf", type: "file", tag: "Exam Prep", tagClass: "badge-exam", author: "Anna K.", date: "2024-12-15", downloads: 234 },
                  { id: "6", name: "Lecture Notes Complete.pdf", type: "file", tag: "Lecture Slides", tagClass: "badge-slides", author: "Prof. Tóth", date: "2024-11-20", downloads: 189 },
                  { id: "7", name: "Golden Summary Notes.pdf", type: "file", tag: "Student Notes", tagClass: "badge-golden", author: "Bence M.", date: "2024-12-01", downloads: 312 },
                ]
              },
              {
                id: "8", name: "Discrete Mathematics", type: "folder", children: [
                  { id: "9", name: "Graph Theory Cheat Sheet.pdf", type: "file", tag: "Student Notes", tagClass: "badge-golden", author: "Márton B.", date: "2024-11-28", downloads: 198 },
                  { id: "10", name: "Midterm Practice Problems.pdf", type: "file", tag: "Exam Prep", tagClass: "badge-exam", author: "Eszter N.", date: "2024-10-15", downloads: 145 },
                ]
              },
              {
                id: "11", name: "Linear Algebra", type: "folder", children: [
                  { id: "12", name: "Week 1-14 Slides.pdf", type: "file", tag: "Lecture Slides", tagClass: "badge-slides", author: "Prof. Kovács", date: "2024-12-10", downloads: 267 },
                  { id: "13", name: "Matrix Operations Guide.pdf", type: "file", tag: "Student Notes", tagClass: "badge-golden", author: "Dániel T.", date: "2024-11-05", downloads: 178 },
                ]
              },
            ]
          },
          {
            id: "14", name: "Year 2", type: "folder", children: [
              {
                id: "15", name: "Algorithms & Data Structures", type: "folder", children: [
                  { id: "16", name: "Sorting Algorithms Comparison.pdf", type: "file", tag: "Student Notes", tagClass: "badge-golden", author: "Gábor L.", date: "2024-11-18", downloads: 203 },
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

function FileTree({ items, depth = 0, onPreview }: { items: FileItem[]; depth?: number; onPreview: (file: FileItem) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "1": true, "2": true, "3": true });

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <div key={item.id}>
          {item.type === "folder" ? (
            <>
              <button
                onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors duration-200 text-sm"
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
              >
                {expanded[item.id] ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <Folder className="h-4 w-4 text-primary" />
                <span className="font-medium">{item.name}</span>
                {item.children && <span className="text-xs text-muted-foreground ml-auto">{item.children.length}</span>}
              </button>
              {expanded[item.id] && item.children && <FileTree items={item.children} depth={depth + 1} onPreview={onPreview} />}
            </>
          ) : (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors duration-200 cursor-pointer group"
              style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{item.name}</span>
              {item.isNew && <Badge className="text-[10px] bg-primary text-primary-foreground border-0 animate-fade-in">New</Badge>}
              {item.tag && <Badge variant="outline" className={`text-[10px] shrink-0 ${item.tagClass}`}>{item.tag}</Badge>}
              <div className="hidden group-hover:flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPreview(item)}>
                  <Eye className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-3 w-3" /></Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type UploadStage = "form" | "uploading" | "indexing" | "done";

export default function Vault() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [vaultData, setVaultData] = useState<FileItem[]>(initialVaultData);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("form");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("linear-algebra");
  const [selectedTag, setSelectedTag] = useState("student-notes");
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const handleUpload = () => {
    if (!fileName.trim()) return;
    setUploadStage("uploading");
    setUploadProgress(0);

    const uploadInterval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 100) {
          clearInterval(uploadInterval);
          setUploadStage("indexing");
          let indexProgress = 0;
          const indexInterval = setInterval(() => {
            indexProgress += 8;
            setUploadProgress(indexProgress);
            if (indexProgress >= 100) {
              clearInterval(indexInterval);
              setUploadStage("done");
              addFileToVault(fileName, selectedFolder, selectedTag);
            }
          }, 120);
          return 100;
        }
        return p + 5;
      });
    }, 80);
  };

  const addFileToVault = (name: string, folder: string, tag: string) => {
    const tagMap: Record<string, { tag: string; tagClass: string }> = {
      "student-notes": { tag: "Student Notes", tagClass: "badge-golden" },
      "exam-prep": { tag: "Exam Prep", tagClass: "badge-exam" },
      "lecture-slides": { tag: "Lecture Slides", tagClass: "badge-slides" },
    };
    const folderMap: Record<string, string> = {
      "linear-algebra": "11", "calculus": "4", "discrete-math": "8", "algorithms": "15",
    };

    const newFile: FileItem = {
      id: `new-${Date.now()}`, name: name.endsWith(".pdf") ? name : `${name}.pdf`,
      type: "file", ...tagMap[tag], author: "Ahmed K.",
      date: new Date().toISOString().split("T")[0], downloads: 0, isNew: true,
    };

    const targetFolderId = folderMap[folder];
    const addToFolder = (items: FileItem[]): FileItem[] =>
      items.map((item) => {
        if (item.id === targetFolderId && item.children) return { ...item, children: [newFile, ...item.children] };
        if (item.children) return { ...item, children: addToFolder(item.children) };
        return item;
      });
    setVaultData((prev) => addToFolder(prev));
  };

  const resetUpload = () => {
    setUploadStage("form"); setUploadProgress(0); setFileName(""); setUploadOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📚 The Vault</h1>
          <p className="text-muted-foreground mt-1">Browse and share academic resources</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) resetUpload(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Upload className="h-4 w-4" /> Upload Resource</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload a Resource</DialogTitle></DialogHeader>
            {uploadStage === "form" && (
              <div className="space-y-4 pt-4">
                <Input placeholder="File title (e.g. Eigenvalue Summary Notes)" value={fileName} onChange={(e) => setFileName(e.target.value)} />
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear-algebra">Linear Algebra</SelectItem>
                    <SelectItem value="calculus">Calculus I</SelectItem>
                    <SelectItem value="discrete-math">Discrete Mathematics</SelectItem>
                    <SelectItem value="algorithms">Algorithms & Data Structures</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
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
                <Button className="w-full" onClick={handleUpload} disabled={!fileName.trim()}>Upload</Button>
              </div>
            )}
            {uploadStage === "uploading" && (
              <div className="py-8 space-y-4">
                <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
                <div className="text-center">
                  <p className="font-medium text-sm">Uploading file...</p>
                  <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{uploadProgress}% complete</p>
              </div>
            )}
            {uploadStage === "indexing" && (
              <div className="py-8 space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <Search className="h-3.5 w-3.5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">Processing & Indexing...</p>
                  <p className="text-xs text-muted-foreground mt-1">Extracting text, tagging, and building search index</p>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-3 w-3 text-success" /> File uploaded successfully</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin text-primary" /> Extracting text content...</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-50"><div className="h-3 w-3" /> Building AI search index...</div>
                </div>
              </div>
            )}
            {uploadStage === "done" && (
              <div className="py-8 space-y-4 text-center">
                <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto"><Check className="h-7 w-7 text-success" /></div>
                <div>
                  <p className="font-semibold">Upload Complete!</p>
                  <p className="text-sm text-muted-foreground mt-1">"{fileName}" has been added to the vault and indexed for search.</p>
                </div>
                <Button onClick={resetUpload} className="w-full">Done</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Filter</Button>
      </div>

      <div className="glass-card p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5" style={{ paddingLeft: `${(i % 3) * 20 + 8}px` }}>
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4" style={{ width: `${120 + Math.random() * 200}px` }} />
              </div>
            ))}
          </div>
        ) : (
          <FileTree items={vaultData} onPreview={setPreviewFile} />
        )}
      </div>

      {/* Quick Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {previewFile?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>by {previewFile?.author}</span>
              <span>·</span>
              <span>{previewFile?.date}</span>
              <span>·</span>
              <span>{previewFile?.downloads} downloads</span>
              {previewFile?.tag && (
                <Badge variant="outline" className={`text-[10px] ${previewFile.tagClass}`}>{previewFile.tag}</Badge>
              )}
            </div>
            {/* Mock PDF Viewer */}
            <div className="bg-muted rounded-lg border border-border overflow-hidden">
              <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Page 1 of 12</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-6 text-xs">Zoom In</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">Zoom Out</Button>
                </div>
              </div>
              <div className="p-8 min-h-[400px] flex flex-col items-center justify-center text-center space-y-4">
                <FileText className="h-16 w-16 text-muted-foreground/30" />
                <div>
                  <p className="font-semibold text-lg">{previewFile?.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">PDF Preview — {previewFile?.author}</p>
                </div>
                <div className="max-w-md text-sm text-muted-foreground leading-relaxed">
                  <p>This is a mock preview of the document. In a production environment, this would render the actual PDF content using a viewer like pdf.js.</p>
                </div>
                <div className="pt-4 flex gap-2">
                  <Button className="gap-2"><Download className="h-4 w-4" /> Download PDF</Button>
                  <Button variant="outline" onClick={() => setPreviewFile(null)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
