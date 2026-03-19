import { useEffect, useState } from "react";
import { FileText, Download, X, ExternalLink, Loader2, Image, FileCode, Sparkles, NotebookPen, Layers, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceBadge } from "@/components/ResourceBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type FileItem } from "./FileTree";
import { useNavigate } from "react-router-dom";
import { extractTextFromPDF } from "@/lib/pdfUtils";
import { toast } from "sonner";

interface PreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
  initialTab?: "preview" | "summary";
}

function getExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_MODEL = "llama-3.3-70b-versatile";

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

// AI Summary tab content
function AISummaryTab({ file }: { file: FileItem }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateSummary = async () => {
    if (!file.storage_path || !API_KEY) {
      toast.error("Cannot generate summary — missing API key or file path.");
      return;
    }
    setIsGenerating(true);
    try {
      const text = await extractTextFromPDF(file.storage_path);
      if (!text.trim()) {
        toast.error("Could not extract text from this PDF.");
        setIsGenerating(false);
        return;
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content: `You are an expert academic summarizer. Create a clear, structured summary of the provided lecture/document. Format your response in markdown with these exact sections:

## 📌 Key Points
(5-7 bullet points of the most important concepts)

## 🧠 Core Concepts
(3-5 main concepts explained in 1-2 sentences each)

## 💡 Important Details
(Any formulas, definitions, or facts worth remembering)

## ❓ Likely Exam Topics
(2-3 topics that are likely to appear in exams based on emphasis)

Be concise and student-friendly.`
            },
            { role: "user", content: "Summarize this lecture:\n\n" + text.slice(0, 8000) }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();
      const responseText = data.choices?.[0]?.message?.content || "";
      setSummary(responseText);
      setGenerated(true);
    } catch {
      toast.error("Could not generate summary. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const parseSections = (md: string) => {
    const sections: { title: string; content: string }[] = [];
    const parts = md.split(/^## /gm).filter(Boolean);
    parts.forEach(part => {
      const lines = part.split("\n");
      const title = lines[0].trim();
      const content = lines.slice(1).join("\n").trim();
      if (title) sections.push({ title, content });
    });
    return sections;
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Reading lecture content...</p>
        <p className="text-xs text-muted-foreground opacity-60">This takes 10-20 seconds</p>
      </div>
    );
  }

  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="font-bold">AI Summary</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Generate a smart summary of this lecture with key points and concepts.
          </p>
        </div>
        <Button onClick={generateSummary} className="gap-2">
          <Sparkles className="h-4 w-4" /> Generate Summary
        </Button>
      </div>
    );
  }

  const sections = parseSections(summary);

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-3 p-4 overflow-y-auto flex-1">
        {sections.map((section, i) => (
          <div key={i} className="bg-card border border-border/40 rounded-xl p-4">
            <h3 className="font-bold text-sm mb-2">{section.title}</h3>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{section.content}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-4 border-t border-border/20 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => navigate("/notes", { state: { prefillTitle: file.name.replace(/\.[^/.]+$/, ""), prefillContent: summary } })}>
          <NotebookPen className="h-3.5 w-3.5 mr-1.5" /> Save as Note
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/flashcards", { state: { vaultFile: { name: file.name, storage_path: file.storage_path } } })}>
          <Layers className="h-3.5 w-3.5 mr-1.5" /> Make Flashcards
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setGenerated(false); setSummary(""); }}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
        </Button>
      </div>
    </div>
  );
}

export function PreviewModal({ file, onClose, initialTab = "preview" }: PreviewModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"preview" | "summary">(initialTab);
  const isPdf = file ? getExt(file.name) === "pdf" : false;

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, file?.id]);

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

        {/* Tab bar for PDFs */}
        {isPdf && file.storage_path && (
          <div className="flex gap-1 border-b border-border/30 shrink-0">
            {(["preview", "summary"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all capitalize ${
                  activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                {tab === "summary" ? "AI Summary" : "Preview"}
              </button>
            ))}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {activeTab === "summary" && isPdf && file.storage_path ? (
            <AISummaryTab file={file} />
          ) : (
            <PreviewContent file={file} />
          )}
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
          {file.storage_path && (
            <Button
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => { onClose(); navigate("/ai-oracle", { state: { attachFile: { name: file.name, storagePath: file.storage_path } } }); }}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Ask AI
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
