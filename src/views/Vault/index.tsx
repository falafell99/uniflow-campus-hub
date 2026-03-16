import { useState, useEffect } from "react";
import { Search, Upload, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/GlassCard";
import { FileTree, FileCard, type FileItem } from "./FileTree";
import { PreviewModal } from "./PreviewModal";
import { UploadDialog, SEMESTER_COURSES, ELECTIVE_COURSES, SECTIONS } from "./UploadDialog";
import { supabase } from "@/lib/supabase";
import { LiveNoteEditor } from "./LiveNoteEditor";
import { formatDistanceToNow } from "date-fns";
import { FileText as FileTextIcon, History } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type VaultFile = {
  id: number;
  name: string;
  subject: string;
  section?: string;
  semester?: number;
  file_type?: string;
  uploader: string;
  downloads: number;
  stars: number;
  created_at: string;
  storage_path?: string | null;
  file_size?: number;
};

const FILE_TYPE_FILTERS = ["All", "Lectures", "Practices", "Labs", "Exams", "Homeworks", "Projects", "Notes", "Cheat Sheets", "Past Papers"];

const SECTION_EMOJIS: Record<string, string> = {
  "Lectures": "📖", "Practices": "💡", "Labs": "🔬", "Exams": "📝",
  "Homeworks": "📋", "Projects": "🧩", "Notes": "📌", "Cheat Sheets": "🗒️",
  "Past Papers": "📂", "Other": "📁",
};

// ─── Build static ELTE fallback tree ──────────────────────────────────────────
function buildStaticTree(): FileItem[] {
  const semesters: FileItem[] = Object.entries(SEMESTER_COURSES).map(([sem, subjects]) => ({
    id: `sem-${sem}`,
    name: `📅 Semester ${sem}`,
    type: "folder" as const,
    children: subjects.map((subject) => ({
      id: `sem-${sem}-${subject}`,
      name: subject,
      type: "folder" as const,
      children: SECTIONS.map((sec) => ({
        id: `sem-${sem}-${subject}-${sec.id}`,
        name: `${sec.emoji} ${sec.id}`,
        type: "folder" as const,
        children: [],
      })),
    })),
  }));

  const electives: FileItem = {
    id: "electives",
    name: "⭐ Elective Courses",
    type: "folder" as const,
    children: ELECTIVE_COURSES.map((subject) => ({
      id: `elective-${subject}`,
      name: subject,
      type: "folder" as const,
      children: SECTIONS.map((sec) => ({
        id: `elective-${subject}-${sec.id}`,
        name: `${sec.emoji} ${sec.id}`,
        type: "folder" as const,
        children: [],
      })),
    })),
  };

  return [...semesters, electives];
}

// ─── Merge DB files into the static tree ─────────────────────────────────────
function mergeFilesIntoTree(tree: FileItem[], files: VaultFile[], urlMap: Record<string, string>): FileItem[] {
  // Build a lookup map: "sem-{n}/{subject}/{section}" or "elective/{subject}/{section}"
  type FileNode = { parentPath: string; item: FileItem };
  const filesByPath: Record<string, FileItem[]> = {};

  for (const f of files) {
    const section = f.section || f.file_type || "Other";
    const semester = f.semester ?? 0;
    const semKey = semester === 0 ? "electives" : `sem-${semester}`;
    const path = `${semKey}/${f.subject}/${section}`;
    if (!filesByPath[path]) filesByPath[path] = [];
    filesByPath[path].push({
      id: String(f.id),
      name: f.name,
      type: "file" as const,
      tag: section,
      tagClass: section === "Exams" ? "badge-exam" : section === "Lectures" ? "badge-slides" : "badge-golden",
      author: f.uploader,
      date: f.created_at.split("T")[0],
      downloads: f.downloads,
      storage_path: f.storage_path ?? undefined,
      storage_url: f.storage_path ? urlMap[f.storage_path] : undefined,
      file_size: f.file_size,
    });
  }

  function injectFiles(items: FileItem[], pathPrefix: string): FileItem[] {
    return items.map((item) => {
      const myPath = pathPrefix ? `${pathPrefix}/${item.name.replace(/^[^\s]+ /, "")}` : item.name;
      if (item.type === "folder") {
        const injectedChildren = injectFiles(item.children ?? [], myPath);
        // Also check if any files belong directly here
        const directFiles = filesByPath[myPath] ?? [];
        return { ...item, children: [...injectedChildren, ...directFiles] };
      }
      return item;
    });
  }

  // Walk the tree injecting real files
  return tree.map((semFolder) => {
    const semKey = semFolder.id; // e.g. "sem-1" or "electives"
    return {
      ...semFolder,
      children: (semFolder.children ?? []).map((subjectFolder) => {
        const subjectName = subjectFolder.name;
        return {
          ...subjectFolder,
          children: (subjectFolder.children ?? []).map((sectionFolder) => {
            // Section folder name looks like "📖 Lectures"
            const sectionName = sectionFolder.name.replace(/^[^\s]+ /, ""); // strip emoji
            const path = `${semKey}/${subjectName}/${sectionName}`;
            const dbFiles = filesByPath[path] ?? [];
            return {
              ...sectionFolder,
              children: [...(sectionFolder.children ?? []), ...dbFiles],
            };
          }),
        };
      }),
    };
  });
}

// Flatten all file nodes in the tree
function flattenFiles(items: FileItem[]): FileItem[] {
  const result: FileItem[] = [];
  for (const item of items) {
    if (item.type === "file") result.push(item);
    if (item.children) result.push(...flattenFiles(item.children));
  }
  return result;
}

// Filter tree recursively for search
function filterTree(items: FileItem[], query: string, typeFilter: string): FileItem[] {
  return items
    .map((item): FileItem | null => {
      if (item.type === "file") {
        const matchesSearch = !query || item.name.toLowerCase().includes(query.toLowerCase()) || (item.author?.toLowerCase().includes(query.toLowerCase()) ?? false);
        const matchesType = typeFilter === "All" || item.tag === typeFilter;
        return matchesSearch && matchesType ? item : null;
      }
      const fc = filterTree(item.children ?? [], query, typeFilter);
      return fc.length > 0 ? { ...item, children: fc } : null;
    })
    .filter(Boolean) as FileItem[];
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Vault() {
  const [searchQuery, setSearchQuery] = useState("");
  const [vaultTree, setVaultTree] = useState<FileItem[]>(buildStaticTree());
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [typeFilter, setTypeFilter] = useState("All");
  const [noteOpen, setNoteOpen] = useState(false);
  const [liveNotes, setLiveNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vault_files")
      .select("*")
      .order("created_at", { ascending: false });

    const baseTree = buildStaticTree();

    if (!error && data && data.length > 0) {
      const paths = (data as VaultFile[]).map((f) => f.storage_path).filter(Boolean) as string[];
      let urlMap: Record<string, string> = {};
      if (paths.length > 0) {
        // We try to get signed URLs if possible
        const { data: signed } = await supabase.storage.from("vault").createSignedUrls(paths, 60 * 60);
        
        // Map by path - Supabase might return path with or without leading slash, or we might have it stored differently
        if (signed) {
          signed.forEach((s) => {
            if (s.signedUrl) {
              const p = s.path;
              urlMap[p] = s.signedUrl;
              
              // Map decoded path as well (many clients store/read literal strings)
              try {
                const decoded = decodeURIComponent(p);
                if (decoded !== p) urlMap[decoded] = s.signedUrl;
              } catch (e) { /* ignore */ }

              // Handle leading slash variants
              const withSlash = p.startsWith("/") ? p : "/" + p;
              const withoutSlash = p.startsWith("/") ? p.substring(1) : p;
              urlMap[withSlash] = s.signedUrl;
              urlMap[withoutSlash] = s.signedUrl;
            }
          });
        }
        
        // Fallback: If some files still don't have URLs, try getPublicUrl (works if bucket is public)
        paths.forEach(p => {
          if (!urlMap[p]) {
            urlMap[p] = supabase.storage.from("vault").getPublicUrl(p).data.publicUrl;
          }
        });
      }
      setVaultTree(mergeFilesIntoTree(baseTree, data as VaultFile[], urlMap));
    } else {
      setVaultTree(baseTree);
    }
    // 2. Fetch live notes
    const { data: notes } = await supabase
      .from("live_notes")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);
    if (notes) setLiveNotes(notes);

    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, []);

  const treeToShow = (searchQuery || typeFilter !== "All")
    ? filterTree(vaultTree, searchQuery, typeFilter)
    : vaultTree;

  const allFiles = flattenFiles(vaultTree);
  const filteredFiles = allFiles.filter((f) => {
    const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "All" || f.tag === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📚 The Vault</h1>
          <p className="text-muted-foreground mt-1 text-sm">ELTE CS BSc · Browse, preview & share academic resources</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setNoteOpen(true)}>
            📝 New Live Note
          </Button>
          <Button className="gap-2" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Upload File
          </Button>
        </div>
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
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")} title="Tree view">
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")} title="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Section filter chips */}
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
              {SECTION_EMOJIS[t] ? `${SECTION_EMOJIS[t]} ` : ""}{t}
            </button>
          ))}
        </div>
      </div>
      
      {/* Recent Notes Section */}
      {liveNotes.length > 0 && !searchQuery && typeFilter === "All" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 text-muted-foreground ml-1">
            <History className="h-4 w-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Recent Live Notes</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {liveNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => { setSelectedNote(note); setNoteOpen(true); }}
                className="glass-subtle p-3 rounded-xl text-left hover:bg-muted/40 transition-all border border-transparent hover:border-primary/20 group hover:shadow-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileTextIcon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{note.title}</h3>
                </div>
                <p className="text-[10px] text-muted-foreground ml-9">
                  Edited {formatDistanceToNow(new Date(note.updated_at))} ago
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <GlassCard padding="p-4">
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5" style={{ paddingLeft: `${(i % 4) * 16 + 8}px` }}>
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4" style={{ width: `${120 + (i * 20) % 100}px` }} />
              </div>
            ))}
          </div>
        </GlassCard>
      ) : allFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center glass-card border-primary/20 bg-primary/5 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="h-24 w-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 scale-110">
            <Upload className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">The Vault is empty</h2>
          <p className="text-muted-foreground max-w-sm mb-8 text-sm leading-relaxed">
            Be the first to upload a resource or lecture note for your fellow students! 
            Helping others is what UniFlow is all about.
          </p>
          <Button 
            size="lg" 
            onClick={() => setUploadOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
          >
            <Upload className="h-5 w-5 mr-2" /> Upload First Resource
          </Button>
        </div>
      ) : viewMode === "list" ? (
        <GlassCard padding="p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
            <p className="text-xs text-muted-foreground">
              {(searchQuery || typeFilter !== "All") ? `${filteredFiles.length} file${filteredFiles.length !== 1 ? "s" : ""} found` : "Full ELTE CS BSc curriculum"}
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
        /* Grid view — show only files */
        <div className="space-y-4">
          {filteredFiles.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 italic">No files match your filters.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredFiles.map((f) => (
                <FileCard key={f.id} item={f} onPreview={setPreviewFile} />
              ))}
            </div>
          )}
        </div>
      )}

      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={loadFiles} />
      <LiveNoteEditor 
        open={noteOpen} 
        onOpenChange={(open) => {
          setNoteOpen(open);
          if (!open) {
            setSelectedNote(null);
            loadFiles(); // Refresh list on close
          }
        }} 
        note={selectedNote}
      />
    </div>
  );
}
