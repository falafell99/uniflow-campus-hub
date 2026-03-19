import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, ChevronDown, Folder, FileText,
  Eye, Download, Image, FileCode, FileSpreadsheet, Presentation,
  Sparkles,
  Layers,
  NotebookPen,
  Heart
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

export const getFileTypeEmoji = (type: string) => ({
  "Lectures": "📖", "Practices": "💡", "Labs": "🔬", "Exams": "📝",
  "Homeworks": "📋", "Projects": "🧩", "Notes": "📌", "Cheat Sheets": "🗒️",
  "Past Papers": "📂"
})[type] || "📄";

export const getFileTypeColor = (type: string) => ({
  "Lectures": "bg-blue-500", "Practices": "bg-green-500", "Labs": "bg-purple-500",
  "Exams": "bg-red-500", "Homeworks": "bg-orange-500", "Projects": "bg-pink-500",
  "Notes": "bg-yellow-500", "Cheat Sheets": "bg-teal-500", "Past Papers": "bg-gray-500"
})[type] || "bg-primary";

export const getFileTypeBg = (type: string) => ({
  "Lectures": "bg-blue-500/10 text-blue-500", "Practices": "bg-green-500/10 text-green-500", "Labs": "bg-purple-500/10 text-purple-500",
  "Exams": "bg-red-500/10 text-red-500", "Homeworks": "bg-orange-500/10 text-orange-500", "Projects": "bg-pink-500/10 text-pink-500",
  "Notes": "bg-yellow-500/10 text-yellow-500", "Cheat Sheets": "bg-teal-500/10 text-teal-500", "Past Papers": "bg-gray-500/10 text-gray-500"
})[type] || "bg-primary/10 text-primary";

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
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <div className="group relative bg-card border border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      
      {/* File type color strip at top */}
      <div className={`h-1.5 w-full ${getFileTypeColor(item.tag || "")} opacity-80 group-hover:opacity-100 transition-opacity`} />
      
      {/* Card body */}
      <div className="p-4 space-y-4">
        
        {/* Icon + title */}
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-[10px] flex items-center justify-center text-xl shrink-0 ${getFileTypeBg(item.tag || "")} shadow-inner`}>
            {getFileTypeEmoji(item.tag || "")}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-bold text-sm leading-snug line-clamp-2 text-foreground/90 group-hover:text-foreground transition-colors" title={item.name}>{item.name}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 truncate">{item.subject || "No subject"}</p>
          </div>
        </div>
        
        {/* Meta row */}
        <div className="flex items-center gap-3.5 text-[11px] font-medium text-muted-foreground/80">
          <span className="flex items-center gap-1.5"><Download className="h-3 w-3" />{item.downloads || 0}</span>
          <span className="flex items-center gap-1.5"><Heart className={`h-3 w-3 ${isLiked ? "fill-red-400 text-red-400" : ""}`} />{likeCount}</span>
          <span className="ml-auto truncate">{item.date}</span>
        </div>
        
        {/* Uploader */}
        <div className="flex items-center gap-2.5 pt-3 border-t border-border/20">
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
            {item.author?.charAt(0).toUpperCase() || "?"}
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground truncate">{item.author || "Unknown"}</span>
        </div>
      </div>
      
      {/* Hover actions overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-card via-card to-transparent opacity-0 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex gap-2 items-center z-10" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" className="flex-1 h-8 text-xs font-semibold shadow-sm" onClick={() => onPreview(item)}>
          <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8 hover:bg-muted shadow-sm shrink-0" onClick={handleLike}>
          <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-red-400 text-red-400" : ""}`} />
        </Button>
        {item.storage_path && (
          <Button size="icon" variant="outline" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 shadow-sm shrink-0" onClick={() => navigate("/ai-oracle", { state: { vaultFile: item } })}>
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
