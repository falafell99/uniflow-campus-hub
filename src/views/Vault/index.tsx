import { useState, useEffect } from "react";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/GlassCard";
import { FileTree, type FileItem } from "./FileTree";
import { UploadDialog } from "./UploadDialog";
import { PreviewModal } from "./PreviewModal";

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
                ],
              },
              {
                id: "8", name: "Discrete Mathematics", type: "folder", children: [
                  { id: "9", name: "Graph Theory Cheat Sheet.pdf", type: "file", tag: "Student Notes", tagClass: "badge-golden", author: "Márton B.", date: "2024-11-28", downloads: 198 },
                  { id: "10", name: "Midterm Practice Problems.pdf", type: "file", tag: "Exam Prep", tagClass: "badge-exam", author: "Eszter N.", date: "2024-10-15", downloads: 145 },
                ],
              },
              {
                id: "11", name: "Linear Algebra", type: "folder", children: [
                  { id: "12", name: "Week 1-14 Slides.pdf", type: "file", tag: "Lecture Slides", tagClass: "badge-slides", author: "Prof. Kovács", date: "2024-12-10", downloads: 267 },
                  { id: "13", name: "Matrix Operations Guide.pdf", type: "file", tag: "Student Notes", tagClass: "badge-golden", author: "Dániel T.", date: "2024-11-05", downloads: 178 },
                ],
              },
            ],
          },
          {
            id: "14", name: "Year 2", type: "folder", children: [
              {
                id: "15", name: "Algorithms & Data Structures", type: "folder", children: [
                  { id: "16", name: "Sorting Algorithms Comparison.pdf", type: "file", tag: "Student Notes", tagClass: "badge-golden", author: "Gábor L.", date: "2024-11-18", downloads: 203 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

/** Recursively inserts a new file into folder with matchId */
function insertIntoFolder(
  items: FileItem[],
  targetId: string,
  file: FileItem
): FileItem[] {
  return items.map((item) => {
    if (item.id === targetId && item.children)
      return { ...item, children: [file, ...item.children] };
    if (item.children)
      return { ...item, children: insertIntoFolder(item.children, targetId, file) };
    return item;
  });
}

export default function Vault() {
  const [searchQuery, setSearchQuery] = useState("");
  const [vaultData, setVaultData] = useState<FileItem[]>(initialVaultData);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const handleFileAdded = (file: FileItem) => {
    // Default insertion target — Linear Algebra folder (id "11")
    setVaultData((prev) => insertIntoFolder(prev, "11", file));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📚 The Vault</h1>
          <p className="text-muted-foreground mt-1">Browse and share academic resources</p>
        </div>
        <UploadDialog onFileAdded={handleFileAdded} />
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filter
        </Button>
      </div>

      <GlassCard padding="p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1.5"
                style={{ paddingLeft: `${(i % 3) * 20 + 8}px` }}
              >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        ) : (
          <FileTree items={vaultData} onPreview={setPreviewFile} />
        )}
      </GlassCard>

      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
