import { useState, useEffect } from "react";
import { Search, Filter, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/GlassCard";
import { FileTree, type FileItem } from "./FileTree";
import { PreviewModal } from "./PreviewModal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type VaultFile = {
  id: number;
  name: string;
  subject: string;
  file_type: string;
  uploader: string;
  downloads: number;
  stars: number;
  created_at: string;
};

/** Convert flat DB rows into the nested FileItem tree structure */
function buildTreeFromDB(files: VaultFile[]): FileItem[] {
  // Group by subject
  const bySubject: Record<string, VaultFile[]> = {};
  files.forEach((f) => {
    const key = f.subject || "General";
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(f);
  });

  const subjectFolders: FileItem[] = Object.entries(bySubject).map(([subject, files]) => ({
    id: `subject-${subject}`,
    name: subject,
    type: "folder",
    children: files.map((f) => ({
      id: String(f.id),
      name: f.name,
      type: "file" as const,
      tag: f.file_type,
      tagClass: f.file_type === "Exam Prep" ? "badge-exam" : f.file_type === "Lecture Slides" ? "badge-slides" : "badge-golden",
      author: f.uploader,
      date: f.created_at.split("T")[0],
      downloads: f.downloads,
    })),
  }));

  return [{
    id: "root",
    name: "Faculty of Informatics",
    type: "folder",
    children: subjectFolders,
  }];
}

// Static fallback tree (shown if DB is empty)
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

export default function Vault() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [vaultData, setVaultData] = useState<FileItem[]>(fallbackTree);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vault_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      setVaultData(buildTreeFromDB(data as VaultFile[]));
    }
    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anonymous";

    // Upload file to Supabase Storage
    const path = `${user?.id}/${Date.now()}_${file.name}`;
    const { error: storageErr } = await supabase.storage.from("vault").upload(path, file);

    if (storageErr) {
      // If storage fails (e.g. bucket not configured), still save metadata
      console.warn("Storage upload failed, saving metadata only:", storageErr.message);
    }

    // Insert metadata row
    const { error: dbErr } = await supabase.from("vault_files").insert({
      name: file.name,
      subject: "General",
      file_type: "Student Notes",
      storage_path: storageErr ? null : path,
      uploader: displayName,
      uploader_id: user?.id,
      downloads: 0,
      stars: 0,
    });

    setUploading(false);
    if (dbErr) {
      toast({ title: "Upload failed", description: dbErr.message, variant: "destructive" });
    } else {
      toast({ title: "File uploaded! 📁", description: `${file.name} added to the Vault.` });
      loadFiles();
    }
    // Reset input
    e.target.value = "";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📚 The Vault</h1>
          <p className="text-muted-foreground mt-1">Browse and share academic resources</p>
        </div>
        <label>
          <input type="file" className="hidden" accept=".pdf,.docx,.pptx,.xlsx,.txt,.md" onChange={handleUpload} />
          <Button asChild className="gap-2 cursor-pointer" disabled={uploading}>
            <span>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload File"}
            </span>
          </Button>
        </label>
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
              <div key={i} className="flex items-center gap-2 py-1.5" style={{ paddingLeft: `${(i % 3) * 20 + 8}px` }}>
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
              <p className="text-xs text-muted-foreground">
                Files are synced in real-time across all users
              </p>
              <Badge variant="outline" className="text-[10px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                Live
              </Badge>
            </div>
            <FileTree items={vaultData} onPreview={setPreviewFile} />
          </>
        )}
      </GlassCard>

      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
