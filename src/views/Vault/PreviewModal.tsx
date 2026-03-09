import { FileText, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceBadge } from "@/components/ResourceBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type FileItem } from "./FileTree";
import { useNavigate } from "react-router-dom";

interface PreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export function PreviewModal({ file, onClose }: PreviewModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={!!file} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {file?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span>by {file?.author}</span>
            <span>·</span>
            <span>{file?.date}</span>
            <span>·</span>
            <span>{file?.downloads} downloads</span>
            {file?.tag && (
              <ResourceBadge tag={file.tag} tagClass={file.tagClass ?? ""} />
            )}
          </div>

          {/* Mock PDF Viewer */}
          <div className="bg-muted rounded-lg border border-border overflow-hidden">
            <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Page 1 of 12</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs">Zoom In</Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs">Zoom Out</Button>
              </div>
            </div>
            <div className="p-8 min-h-[400px] flex flex-col items-center justify-center text-center space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground/30" />
              <div>
                <p className="font-semibold text-lg">{file?.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF Preview — {file?.author}
                </p>
              </div>
              <div className="max-w-md text-sm text-muted-foreground leading-relaxed">
                <p>
                  This is a mock preview of the document. In a production environment, this
                  would render the actual PDF content using a viewer like pdf.js.
                </p>
              </div>
              <div className="pt-4 flex gap-2 flex-wrap justify-center">
                <Button className="gap-2">
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    onClose();
                    navigate(`/studio?file=${encodeURIComponent(file?.name ?? "")}`);
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Open in Studio
                </Button>
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
