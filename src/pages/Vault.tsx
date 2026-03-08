import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FileText, Upload, Search, Filter, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

type FileItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  tag?: string;
  tagClass?: string;
  author?: string;
  date?: string;
  downloads?: number;
  children?: FileItem[];
};

const vaultData: FileItem[] = [
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

function FileTree({ items, depth = 0 }: { items: FileItem[]; depth?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "1": true, "2": true, "3": true });

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <div key={item.id}>
          {item.type === "folder" ? (
            <>
              <button
                onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-sm"
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
              >
                {expanded[item.id] ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <Folder className="h-4 w-4 text-primary" />
                <span className="font-medium">{item.name}</span>
                {item.children && <span className="text-xs text-muted-foreground ml-auto">{item.children.length}</span>}
              </button>
              {expanded[item.id] && item.children && <FileTree items={item.children} depth={depth + 1} />}
            </>
          ) : (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
              style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{item.name}</span>
              {item.tag && <Badge variant="outline" className={`text-[10px] shrink-0 ${item.tagClass}`}>{item.tag}</Badge>}
              <div className="hidden group-hover:flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6"><Eye className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-3 w-3" /></Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Vault() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📚 The Vault</h1>
          <p className="text-muted-foreground mt-1">Browse and share academic resources</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" /> Upload Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload a Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="File title" />
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm">Drag & drop your file here, or click to browse</p>
                <p className="text-xs mt-1">PDF, DOCX, PPTX up to 50MB</p>
              </div>
              <Button className="w-full">Upload</Button>
            </div>
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
        <FileTree items={vaultData} />
      </div>
    </div>
  );
}
