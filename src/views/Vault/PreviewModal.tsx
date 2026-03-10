import { useEffect, useState } from "react";
import { FileText, Download, X, ExternalLink, Loader2, Image, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceBadge } from "@/components/ResourceBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type FileItem } from "./FileTree";

interface PreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
}

function getExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function PreviewContent({ file }: { file: FileItem }) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const ext = getExt(file.name);

  const isPdf = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
  const isText = ["txt", "md", "csv", "json", "py", "js", "ts"].includes(ext);

  useEffect(() => {
    if (isText && file.storage_url) {
      setLoadingText(true);
      fetch(file.storage_url)
        .then((r) => r.text())
        .then((t) => { setTextContent(t); setLoadingText(false); })
        .catch(() => { setTextContent("Could not load file content."); setLoadingText(false); });
    }
  }, [file.storage_url, isText]);

  if (!file.storage_url) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center gap-4 text-muted-foreground">
        <FileText className="h-16 w-16 opacity-20" />
        <p className="text-sm">No preview available — this file has no stored content.</p>
        <p className="text-xs opacity-60">Upload a new version to enable preview & download.</p>
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={file.storage_url}
        title={file.name}
        className="w-full rounded-lg border border-border"
        style={{ height: "calc(80vh - 180px)", minHeight: 400 }}
      />
    );
  }

  if (isImage) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4" style={{ minHeight: 300 }}>
        <img src={file.storage_url} alt={file.name} className="max-w-full max-h-[60vh] rounded-md object-contain" />
      </div>
    );
  }

  if (isText) {
    if (loadingText) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <pre className="bg-muted/40 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[60vh] whitespace-pre-wrap border border-border/40">
        {textContent}
      </pre>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-muted-foreground text-center">
      <FileText className="h-16 w-16 opacity-20" />
      <div>
        <p className="text-sm font-medium">.{ext.toUpperCase()} file</p>
        <p className="text-xs mt-1">No inline preview for this file type — click Download to open it.</p>
      </div>
    </div>
  );
}

export function PreviewModal({ file, onClose }: PreviewModalProps) {
  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{file.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap shrink-0 pb-2 border-b border-border/30">
          {file.author && <span>by <span className="font-medium text-foreground">{file.author}</span></span>}
          {file.date && <><span>·</span><span>{file.date}</span></>}
          {file.downloads !== undefined && <><span>·</span><span>{file.downloads} downloads</span></>}
          {file.tag && <ResourceBadge tag={file.tag} tagClass={file.tagClass ?? ""} />}
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto">
          <PreviewContent file={file} />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/30 shrink-0">
          {file.storage_url ? (
            <a href={file.storage_url} download={file.name} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full gap-2">
                <Download className="h-4 w-4" /> Download {file.name.split(".").pop()?.toUpperCase()}
              </Button>
            </a>
          ) : (
            <Button className="flex-1 gap-2" disabled>
              <Download className="h-4 w-4" /> No file stored
            </Button>
          )}
          {file.storage_url && (
            <a href={file.storage_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="icon" title="Open in new tab">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
          <Button variant="outline" onClick={onClose} size="icon">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
