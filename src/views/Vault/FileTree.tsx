import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FileText, Eye, Download } from "lucide-react";
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
  children?: FileItem[];
};

interface FileTreeProps {
  items: FileItem[];
  depth?: number;
  onPreview: (file: FileItem) => void;
}

export function FileTree({ items, depth = 0, onPreview }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "1": true,
    "2": true,
    "3": true,
  });

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <div key={item.id}>
          {item.type === "folder" ? (
            <>
              <button
                onClick={() =>
                  setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))
                }
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors duration-200 text-sm"
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
              >
                {expanded[item.id] ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Folder className="h-4 w-4 text-primary" />
                <span className="font-medium">{item.name}</span>
                {item.children && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {item.children.length}
                  </span>
                )}
              </button>
              {expanded[item.id] && item.children && (
                <FileTree items={item.children} depth={depth + 1} onPreview={onPreview} />
              )}
            </>
          ) : (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors duration-200 cursor-pointer group"
              style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{item.name}</span>
              {item.isNew && (
                <Badge className="text-[10px] bg-primary text-primary-foreground border-0 animate-fade-in">
                  New
                </Badge>
              )}
              {item.tag && <ResourceBadge tag={item.tag} tagClass={item.tagClass ?? ""} />}
              <div className="hidden group-hover:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onPreview(item)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
