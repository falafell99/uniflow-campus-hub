import { useState, useEffect } from "react";
import { Search, FileText, BookOpen, X, Loader2, Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface VaultFile {
  id: number;
  name: string;
  subject: string;
  section?: string;
  file_type?: string;
  storage_path: string | null;
}

interface VaultFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: { name: string; storagePath: string }) => void;
}

const SECTION_COLORS: Record<string, string> = {
  Lectures: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Notes: "bg-green-500/10 text-green-400 border-green-500/20",
  Labs: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Exams: "bg-red-500/10 text-red-400 border-red-500/20",
  Homeworks: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export function VaultFilePicker({ open, onOpenChange, onSelect }: VaultFilePickerProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("vault_files")
      .select("id, name, subject, section, file_type, storage_path")
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setFiles((data as VaultFile[]) || []);
        setLoading(false);
      });
  }, [open]);

  const filtered = files.filter(f => {
    const q = query.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || f.subject?.toLowerCase().includes(q);
  });

  const handleSelect = async (file: VaultFile) => {
    if (!file.storage_path) return;
    onSelect({ name: file.name, storagePath: file.storage_path });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            Attach Context from Vault
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1 mb-2">
          Select a lecture or note — AI Oracle will use it as the primary source for your questions.
        </p>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search by name or subject…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* File list */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{query ? "No files match your search." : "No files in the Vault yet."}</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-1.5">
              {filtered.map(file => {
                const section = file.section || file.file_type || "Other";
                const colorClass = SECTION_COLORS[section] || "bg-muted/50 text-muted-foreground border-border/40";
                const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
                const isPdf = ext === "PDF";
                return (
                  <button
                    key={file.id}
                    onClick={() => handleSelect(file)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/40 hover:border-primary/40 transition-all text-left group"
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isPdf ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"}`}>
                      {ext || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{file.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{file.subject}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 px-1.5 py-0 h-4 border ${colorClass}`}>
                      {section}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
