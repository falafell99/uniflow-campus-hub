import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, ChevronDown, Folder, FileText,
  Eye, Download, Image, FileCode, FileSpreadsheet, Presentation,
  Sparkles,
  Layers,
  NotebookPen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceBadge } from "@/components/ResourceBadge";

export type FileItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  tag?: string;
  tagClass?: string;
  author?: string;
  date?: string;
  downloads?: number;
  isNew?: boolean;
  storage_url?: string;
  storage_path?: string;
  file_size?: number;
  subject?: string;
  children?: FileItem[];
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <Image className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (["js", "ts", "tsx", "jsx", "py", "java", "cpp", "c"].includes(ext))
    return <FileCode className="h-4 w-4 text-blue-400 shrink-0" />;
  if (["xlsx", "csv"].includes(ext))
    return <FileSpreadsheet className="h-4 w-4 text-green-400 shrink-0" />;
  if (["pptx", "ppt"].includes(ext))
    return <Presentation className="h-4 w-4 text-orange-400 shrink-0" />;
  return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function formatSize(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface FileTreeProps {
  items: FileItem[];
  depth?: number;
  onPreview: (file: FileItem) => void;
}

export function FileTree({ items, depth = 0, onPreview }: FileTreeProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    root: true, "1": true, "2": true, "3": true,
  });

  function toggle(id: string) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <div key={item.id}>
          {item.type === "folder" ? (
            <>
              <button
                onClick={() => toggle(item.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-sm"
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
              >
                {expanded[item.id]
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                }
                <Folder className={`h-4 w-4 shrink-0 ${expanded[item.id] ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-medium">{item.name}</span>
                {item.children && (
                  <span className="text-xs text-muted-foreground ml-auto">{item.children.length}</span>
                )}
              </button>
              {expanded[item.id] && item.children && (
                <FileTree items={item.children} depth={depth + 1} onPreview={onPreview} />
              )}
            </>
          ) : (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
              style={{ paddingLeft: `${depth * 20 + 8}px` }}
              onClick={() => onPreview(item)}
            >
              {getFileIcon(item.name)}
              <span className="text-sm truncate flex-1">{item.name}</span>

              {item.isNew && (
                <Badge className="text-[10px] bg-primary text-primary-foreground border-0 animate-fade-in shrink-0">New</Badge>
              )}
              {formatSize(item.file_size) && (
                <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(item.file_size)}</span>
              )}
              {item.tag && <ResourceBadge tag={item.tag} tagClass={item.tagClass ?? ""} />}

              <div className="hidden group-hover:flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Preview" onClick={() => onPreview(item)}>
                  <Eye className="h-3 w-3" />
                </Button>
                {item.storage_path && (
                  <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[10px] gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => navigate("/ai-oracle", { 
                          state: { vaultFile: { name: item.name, storage_path: item.storage_path } } 
                        })}
                      >
                        <Sparkles className="h-3 w-3" /> Ask Oracle
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[10px] gap-1.5 text-amber-400 hover:text-amber-400 hover:bg-amber-400/10"
                        onClick={() => navigate("/flashcards", { 
                          state: { vaultFile: { name: item.name, storage_path: item.storage_path } } 
                        })}
                      >
                        <Layers className="h-3 w-3" /> Make Flashcards
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[10px] gap-1.5 text-blue-400 hover:text-blue-400 hover:bg-blue-400/10"
                        onClick={() => navigate("/notes", {
                          state: {
                            prefillTitle: item.name.replace(/\.[^/.]+$/, ""),
                            prefillSubject: item.subject || "",
                            prefillContent: `📎 Source file: ${item.name}\n\nNotes from this file:`
                          }
                        })}
                        title="Create Note"
                      >
                        <NotebookPen className="h-3 w-3" /> Create Note
                      </Button>
                  </>
                )}
                {item.storage_url ? (
                  <a href={item.storage_url} download={item.name} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Download">
                      <Download className="h-3 w-3" />
                    </Button>
                  </a>
                ) : (
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-40" disabled title="No file stored">
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Grid View Card ───────────────────────────────────────────────────────────
export function FileCard({ item, onPreview }: { item: FileItem; onPreview: (f: FileItem) => void }) {
  const navigate = useNavigate();
  const ext = item.name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);

  return (
    <div
      className="glass-card p-4 flex flex-col gap-3 cursor-pointer hover:border-primary/30 transition-all hover:shadow-lg group"
      onClick={() => onPreview(item)}
    >
      {/* Thumbnail or icon */}
      <div className="h-28 rounded-lg bg-muted/40 flex items-center justify-center overflow-hidden">
        {isImage && item.storage_url ? (
          <img src={item.storage_url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {getFileIcon(item.name)}
            <span className="text-[10px] uppercase font-mono">.{ext || "file"}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" title={item.name}>{item.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{item.author} · {item.date}</p>
        {item.tag && <ResourceBadge tag={item.tag} tagClass={item.tagClass ?? ""} />}
      </div>

      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        {item.storage_path && (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-primary" 
              title="Ask Oracle"
              onClick={() => navigate("/ai-oracle", { state: { vaultFile: item } })}
            >
              <Sparkles className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-amber-400" 
              title="Make Flashcards"
              onClick={() => navigate("/flashcards", { state: { vaultFile: { name: item.name, storage_path: item.storage_path } } })}
            >
              <Layers className="h-3 w-3" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPreview(item)}>
          <Eye className="h-3 w-3" />
        </Button>
        {item.storage_url && (
          <a href={item.storage_url} download={item.name} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Download className="h-3 w-3" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
