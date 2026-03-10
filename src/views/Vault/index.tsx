import { useState, useEffect } from "react";
import { Search, Upload, LayoutGrid, List, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/GlassCard";
import { FileTree, FileCard, type FileItem } from "./FileTree";
import { PreviewModal } from "./PreviewModal";
import { UploadDialog } from "./UploadDialog";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type VaultFile = {
  id: number;
  name: string;
  subject: string;
  file_type: string;
  uploader: string;
  downloads: number;
  stars: number;
  created_at: string;
  storage_path?: string | null;
  file_size?: number;
};

const FILE_TYPE_FILTERS = ["All", "Lecture Slides", "Exam Prep", "Student Notes", "Cheat Sheet", "Practice Problems"];

// ─── Build tree from DB rows with signed URLs ─────────────────────────────────
async function buildTreeWithUrls(files: VaultFile[]): Promise<FileItem[]> {
  // Batch-generate signed URLs for all files that have storage_path
  const paths = files.map((f) => f.storage_path).filter(Boolean) as string[];
  let urlMap: Record<string, string> = {};

  if (paths.length > 0) {
    const { data } = await supabase.storage.from("vault").createSignedUrls(paths, 60 * 60); // 1 hour
    if (data) {
      data.forEach((item) => {
        if (item.signedUrl) urlMap[item.path] = item.signedUrl;
      });
    }
  }

  const bySubject: Record<string, VaultFile[]> = {};
  files.forEach((f) => {
    const key = f.subject || "General";
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(f);
  });

  const subjectFolders: FileItem[] = Object.entries(bySubject).map(([subject, subFiles]) => ({
    id: `subject-${subject}`,
    name: subject,
    type: "folder" as const,
    children: subFiles.map((f) => ({
      id: String(f.id),
      name: f.name,
      type: "file" as const,
      tag: f.file_type,
      tagClass: f.file_type === "Exam Prep" ? "badge-exam" : f.file_type === "Lecture Slides" ? "badge-slides" : "badge-golden",
      author: f.uploader,
      date: f.created_at.split("T")[0],
      downloads: f.downloads,
      storage_path: f.storage_path ?? undefined,
      storage_url: f.storage_path ? urlMap[f.storage_path] : undefined,
      file_size: f.file_size,
    })),
  }));

  return [{ id: "root", name: "Faculty of Informatics", type: "folder" as const, children: subjectFolders }];
}

// Static fallback
const fallbackTree: FileItem[] = [
  {
    id: "1", name: "Faculty of Informatics", type: "folder", children: [
      {
        id: "2", name: "Calculus I", type: "folder", children: [
          { id: "5", name: "Final Exam Solutions 2024.pdf", type: "file", tag: "Exam Prep", tagClass: "badge-exam", author: "Anna K.", date: "2024-12-15", downloads: 234 },
          { id: "6", name: "Lecture Notes Complete.pdf", type: "file", tag: "Lecture Slides", tagClass: "badge-slides", author: "Prof. Tóth", date: "2024-11-20", downloads: 189 },
        ],
      },
      {
        id: "3", name: "Linear Algebra", type: "folder", children: [
          { id: "7", name: "Week 1–14 Slides.pdf", type: "file", tag: "Lecture Slides", tagClass: "badge-slides", author: "Prof. Kovács", date: "2024-12-10", downloads: 267 },
        ],
      },
    ],
  },
];

// Flatten tree to get all file items (for grid and searching)
function flattenFiles(items: FileItem[]): FileItem[] {
  const result: FileItem[] = [];
  for (const item of items) {
    if (item.type === "file") result.push(item);
    if (item.children) result.push(...flattenFiles(item.children));
  }
  return result;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Vault() {
  const [searchQuery, setSearchQuery] = useState("");
  const [vaultData, setVaultData] = useState<FileItem[]>(fallbackTree);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [typeFilter, setTypeFilter] = useState("All");

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vault_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const tree = await buildTreeWithUrls(data as VaultFile[]);
      setVaultData(tree);
    }
    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, []);

  // Filter files for search + type filter
  const allFiles = flattenFiles(vaultData);
  const filtered = allFiles.filter((f) => {
    const matchesSearch = !searchQuery.trim() ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.author?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = typeFilter === "All" || f.tag === typeFilter;
    return matchesSearch && matchesType;
  });

  // For grid view: group filtered files by subject folder
  const subjectGroups = (() => {
    const groups: Record<string, FileItem[]> = {};
    // Walk the tree to know which subject each file belongs to
    const root = vaultData[0];
    if (root?.children) {
      for (const folder of root.children) {
        const name = folder.name;
        const files = (folder.children ?? []).filter((f) =>
          filtered.some((ff) => ff.id === f.id)
        );
        if (files.length > 0) groups[name] = files;
      }
    }
    return groups;
  })();

  // For list search: filter the tree
  function filterTree(items: FileItem[]): FileItem[] {
    return items
      .map((item) => {
        if (item.type === "file") {
          const matchesSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.author?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
          const matchesType = typeFilter === "All" || item.tag === typeFilter;
          return matchesSearch && matchesType ? item : null;
        }
        const filteredChildren = filterTree(item.children ?? []);
        return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
      })
      .filter(Boolean) as FileItem[];
  }

  const treeToShow = (searchQuery || typeFilter !== "All") ? filterTree(vaultData) : vaultData;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📚 The Vault</h1>
          <p className="text-muted-foreground mt-1 text-sm">Browse, preview, and share academic resources</p>
        </div>
        <Button className="gap-2" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" /> Upload File
        </Button>
      </div>

      {/* Search + Filters + View toggle */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files by name or author…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 glass-subtle rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* File type filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {FILE_TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/50 text-muted-foreground hover:border-primary/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <GlassCard padding="p-4">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5" style={{ paddingLeft: `${(i % 3) * 20 + 8}px` }}>
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </GlassCard>
      ) : viewMode === "list" ? (
        <GlassCard padding="p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
            <p className="text-xs text-muted-foreground">
              {filtered.length} file{filtered.length !== 1 ? "s" : ""} {typeFilter !== "All" ? `· ${typeFilter}` : ""}
            </p>
            <Badge variant="outline" className="text-[10px] gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" /> Live
            </Badge>
          </div>
          {treeToShow.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 italic">No files match your search.</p>
          ) : (
            <FileTree items={treeToShow} onPreview={setPreviewFile} />
          )}
        </GlassCard>
      ) : (
        // Grid view grouped by subject
        <div className="space-y-6">
          {Object.keys(subjectGroups).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 italic">No files match your search.</p>
          ) : (
            Object.entries(subjectGroups).map(([subject, files]) => (
              <div key={subject}>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  📁 {subject}
                  <span className="text-xs text-muted-foreground font-normal">{files.length} file{files.length !== 1 ? "s" : ""}</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {files.map((f) => (
                    <FileCard key={f.id} item={f} onPreview={setPreviewFile} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={loadFiles} />
    </div>
  );
}
