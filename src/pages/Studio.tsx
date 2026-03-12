import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  AudioLines, Presentation, PlayCircle, Network, FileCheck, BarChart3,
  Pencil, Sparkles, ArrowRight, FileText, ChevronLeft, Loader2, Check,
  Play, Pause, Volume2, Download, Copy, RotateCcw,
  ChevronRight, BarChart2, BookOpen, ListChecks, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { StudioFileUpload, type UploadedFile } from "@/components/StudioFileUpload";
import Whiteboard from "@/pages/Whiteboard";

type ToolId = "audio" | "presentation" | "video" | "mentalmap" | "reports" | "infographics" | "studio";

type Tool = {
  id: ToolId;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
};

const tools: Tool[] = [
  { id: "audio", title: "Audio Summary", description: "Convert notes into podcast-style audio summaries", icon: <AudioLines className="h-6 w-6" />, color: "text-primary" },
  { id: "presentation", title: "Presentation Generator", description: "Auto-generate slide decks from your notes", icon: <Presentation className="h-6 w-6" />, badge: "BETA", color: "text-warning" },
  { id: "video", title: "Video Summary", description: "Create visual explainers from course material", icon: <PlayCircle className="h-6 w-6" />, color: "text-success" },
  { id: "mentalmap", title: "Unified Workspace", description: "Organize your study into spaces and tasks", icon: <Network className="h-6 w-6" />, color: "text-info" },
  { id: "reports", title: "Reports & Tests", description: "Generate quizzes and study reports", icon: <FileCheck className="h-6 w-6" />, color: "text-destructive" },
  { id: "studio", title: "Team Studio", description: "Collaborative whiteboard for teamwork & diagrams", icon: <Pencil className="h-6 w-6" />, badge: "NEW", color: "text-primary" },
  { id: "infographics", title: "Infographics", description: "Turn data into beautiful visual summaries", icon: <BarChart3 className="h-6 w-6" />, badge: "BETA", color: "text-warning" },
];

// ─── Audio Summary Tool ─────────────────────────────────────────────────────
function AudioTool({ files }: { files: UploadedFile[] }) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);

  const generate = () => {
    setProcessing(true);
    setProgress(0);
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(iv); setProcessing(false); setDone(true); return 100; }
        return p + 2;
      });
    }, 80);
  };

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setPlayProgress((p) => { if (p >= 100) { setPlaying(false); return 0; } return p + 0.5; });
    }, 100);
    return () => clearInterval(iv);
  }, [playing]);

  if (!done) {
    return (
      <div className="space-y-4 text-center py-6">
        {processing ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium">Analyzing content & generating audio...</p>
            <Progress value={progress} className="max-w-xs mx-auto h-2" />
            <p className="text-xs text-muted-foreground">{Math.round(progress)}% — Extracting key concepts</p>
          </>
        ) : (
          <>
            <AudioLines className="h-10 w-10 text-primary mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">Upload files and generate a podcast-style audio summary</p>
            <Button onClick={generate} disabled={files.length === 0} className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate Audio Summary
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Check className="h-4 w-4 text-success" />
        <span className="font-medium">Audio summary generated</span>
        <Badge variant="outline" className="text-[10px]">3:42</Badge>
      </div>
      {/* Player */}
      <div className="glass-subtle p-4 rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex-1">
            <Progress value={playProgress} className="h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{Math.floor(playProgress * 2.22 / 60)}:{String(Math.floor(playProgress * 2.22) % 60).padStart(2, "0")}</span>
              <span>3:42</span>
            </div>
          </div>
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">📝 Transcript Preview:</p>
          <p>"In this summary, we cover the key concepts from your uploaded materials. Starting with the foundational definitions, we explore how these ideas interconnect and build upon each other..."</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Download MP3</Button>
        <Button variant="outline" size="sm" className="gap-1.5"><Copy className="h-3.5 w-3.5" /> Copy Transcript</Button>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setDone(false); setPlayProgress(0); }}><RotateCcw className="h-3.5 w-3.5" /> Regenerate</Button>
      </div>
    </div>
  );
}

// ─── Presentation Generator Tool ────────────────────────────────────────────
function PresentationTool({ files }: { files: UploadedFile[] }) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { title: "Introduction", content: "Overview of key concepts extracted from your materials", bg: "bg-primary/10" },
    { title: "Core Definitions", content: "Fundamental terms and their precise meanings", bg: "bg-success/10" },
    { title: "Key Theorems", content: "Important theorems with proof sketches", bg: "bg-warning/10" },
    { title: "Examples & Applications", content: "Real-world applications and worked examples", bg: "bg-info/10" },
    { title: "Practice Problems", content: "Self-assessment questions for review", bg: "bg-destructive/10" },
    { title: "Summary & References", content: "Key takeaways and source references", bg: "bg-primary/10" },
  ];

  const generate = () => {
    setProcessing(true); setProgress(0);
    const iv = setInterval(() => {
      setProgress((p) => { if (p >= 100) { clearInterval(iv); setProcessing(false); setDone(true); return 100; } return p + 3; });
    }, 100);
  };

  if (!done) {
    return (
      <div className="space-y-4 text-center py-6">
        {processing ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-warning mx-auto" />
            <p className="text-sm font-medium">Generating slide deck...</p>
            <Progress value={progress} className="max-w-xs mx-auto h-2" />
            <p className="text-xs text-muted-foreground">Creating {Math.min(Math.floor(progress / 16) + 1, 6)} of 6 slides</p>
          </>
        ) : (
          <>
            <Presentation className="h-10 w-10 text-warning mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">Auto-generate a slide deck from your uploaded files</p>
            <Button onClick={generate} disabled={files.length === 0} className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate Presentation
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-success" />
          <span className="font-medium">{slides.length} slides generated</span>
        </div>
        <div className="text-xs text-muted-foreground">Slide {currentSlide + 1} / {slides.length}</div>
      </div>
      {/* Slide preview */}
      <div className={`${slides[currentSlide].bg} rounded-xl border border-border/40 p-8 min-h-[240px] flex flex-col items-center justify-center text-center transition-all duration-300`}>
        <h2 className="text-xl font-bold mb-3">{slides[currentSlide].title}</h2>
        <p className="text-sm text-muted-foreground max-w-md">{slides[currentSlide].content}</p>
        <div className="mt-6 flex items-center gap-1">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentSlide ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentSlide === 0} onClick={() => setCurrentSlide((c) => c - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide((c) => c + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export PPTX</Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setDone(false); setCurrentSlide(0); }}><RotateCcw className="h-3.5 w-3.5" /> Redo</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Video Summary Tool ─────────────────────────────────────────────────────
function VideoTool({ files }: { files: UploadedFile[] }) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const generate = () => {
    setProcessing(true); setProgress(0);
    const iv = setInterval(() => {
      setProgress((p) => { if (p >= 100) { clearInterval(iv); setProcessing(false); setDone(true); return 100; } return p + 1.5; });
    }, 120);
  };

  if (!done) {
    return (
      <div className="space-y-4 text-center py-6">
        {processing ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-success mx-auto" />
            <p className="text-sm font-medium">Rendering video explainer...</p>
            <Progress value={progress} className="max-w-xs mx-auto h-2" />
            <p className="text-xs text-muted-foreground">{progress < 30 ? "Extracting key visuals..." : progress < 60 ? "Generating scenes..." : progress < 90 ? "Adding narration..." : "Finalizing..."}</p>
          </>
        ) : (
          <>
            <PlayCircle className="h-10 w-10 text-success mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">Create a visual explainer video from your materials</p>
            <Button onClick={generate} disabled={files.length === 0} className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate Video
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Check className="h-4 w-4 text-success" />
        <span className="font-medium">Video explainer ready</span>
        <Badge variant="outline" className="text-[10px]">2:18</Badge>
      </div>
      {/* Video player mock */}
      <div className="bg-foreground/5 rounded-xl border border-border/40 overflow-hidden">
        <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-muted/80 to-muted relative">
          <div className="text-center">
            <PlayCircle className="h-16 w-16 text-primary/60 mx-auto mb-3 cursor-pointer hover:text-primary transition-colors" />
            <p className="text-sm font-medium">Video Summary</p>
            <p className="text-xs text-muted-foreground">Based on {files.map((f) => f.name).join(", ")}</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/80">
            <Progress value={0} className="h-1" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0:00</span><span>2:18</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Download MP4</Button>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setDone(false)}><RotateCcw className="h-3.5 w-3.5" /> Regenerate</Button>
      </div>
    </div>
  );
}

// ─── Reports & Tests Tool ───────────────────────────────────────────────────
function ReportsTool({ files }: { files: UploadedFile[] }) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const questions = [
    { q: "What is the primary purpose of normalization in databases?", opts: ["Speed up queries", "Reduce data redundancy", "Add more tables", "Encrypt data"], correct: 1 },
    { q: "Which time complexity describes Merge Sort?", opts: ["O(n)", "O(n²)", "O(n log n)", "O(log n)"], correct: 2 },
    { q: "What does ACID stand for in database systems?", opts: ["Automated, Concurrent, Isolated, Durable", "Atomicity, Consistency, Isolation, Durability", "Applied, Cached, Indexed, Distributed", "Asynchronous, Clustered, Integrated, Decentralized"], correct: 1 },
    { q: "A vector space requires closure under which operations?", opts: ["Only addition", "Only scalar multiplication", "Addition and scalar multiplication", "Division and subtraction"], correct: 2 },
    { q: "What is an eigenvector?", opts: ["A vector that reverses direction", "A vector that only gets scaled by a matrix", "The zero vector", "A unit vector"], correct: 1 },
  ];

  const generate = () => {
    setProcessing(true); setProgress(0);
    const iv = setInterval(() => {
      setProgress((p) => { if (p >= 100) { clearInterval(iv); setProcessing(false); setDone(true); return 100; } return p + 4; });
    }, 80);
  };

  const score = Object.entries(answers).filter(([i, a]) => questions[Number(i)].correct === a).length;

  if (!done) {
    return (
      <div className="space-y-4 text-center py-6">
        {processing ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-destructive mx-auto" />
            <p className="text-sm font-medium">Generating quiz from your materials...</p>
            <Progress value={progress} className="max-w-xs mx-auto h-2" />
          </>
        ) : (
          <>
            <FileCheck className="h-10 w-10 text-destructive mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">Generate a quiz to test your understanding</p>
            <Button onClick={generate} disabled={files.length === 0} className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate Quiz
            </Button>
          </>
        )}
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className={`h-20 w-20 rounded-full mx-auto flex items-center justify-center ${score >= 4 ? "bg-success/10" : score >= 3 ? "bg-warning/10" : "bg-destructive/10"}`}>
          <span className={`text-2xl font-bold ${score >= 4 ? "text-success" : score >= 3 ? "text-warning" : "text-destructive"}`}>{score}/{questions.length}</span>
        </div>
        <p className="font-semibold">{score >= 4 ? "Excellent!" : score >= 3 ? "Good job!" : "Keep studying!"}</p>
        <p className="text-sm text-muted-foreground">You answered {score} out of {questions.length} correctly</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => { setShowResults(false); setAnswers({}); }}>Retry</Button>
          <Button variant="ghost" size="sm" onClick={() => { setDone(false); setAnswers({}); setShowResults(false); }}><RotateCcw className="h-3.5 w-3.5 mr-1" /> New Quiz</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <ListChecks className="h-4 w-4 text-primary" />
          <span className="font-medium">{questions.length} questions generated</span>
        </div>
        <Button size="sm" disabled={Object.keys(answers).length < questions.length} onClick={() => setShowResults(true)}>
          Submit ({Object.keys(answers).length}/{questions.length})
        </Button>
      </div>
      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scroll pr-1">
        {questions.map((q, qi) => (
          <div key={qi} className="glass-subtle p-4 rounded-xl space-y-2.5">
            <p className="text-sm font-medium">{qi + 1}. {q.q}</p>
            <div className="grid grid-cols-1 gap-1.5">
              {q.opts.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                    answers[qi] === oi
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border/40 hover:border-primary/30 hover:bg-muted/40"
                  }`}
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Infographics Tool ──────────────────────────────────────────────────────
function InfographicsTool({ files }: { files: UploadedFile[] }) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const stats = [
    { label: "Key Concepts", value: "12", icon: <BookOpen className="h-4 w-4" />, color: "text-primary" },
    { label: "Definitions", value: "8", icon: <FileText className="h-4 w-4" />, color: "text-success" },
    { label: "Formulas", value: "5", icon: <BarChart2 className="h-4 w-4" />, color: "text-warning" },
    { label: "Examples", value: "15", icon: <ListChecks className="h-4 w-4" />, color: "text-info" },
  ];

  const generate = () => {
    setProcessing(true); setProgress(0);
    const iv = setInterval(() => {
      setProgress((p) => { if (p >= 100) { clearInterval(iv); setProcessing(false); setDone(true); return 100; } return p + 2.5; });
    }, 90);
  };

  if (!done) {
    return (
      <div className="space-y-4 text-center py-6">
        {processing ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-warning mx-auto" />
            <p className="text-sm font-medium">Designing infographic...</p>
            <Progress value={progress} className="max-w-xs mx-auto h-2" />
            <p className="text-xs text-muted-foreground">{progress < 40 ? "Analyzing structure..." : progress < 70 ? "Creating visual layout..." : "Rendering graphics..."}</p>
          </>
        ) : (
          <>
            <BarChart3 className="h-10 w-10 text-warning mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">Turn your materials into a visual infographic</p>
            <Button onClick={generate} disabled={files.length === 0} className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate Infographic
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Check className="h-4 w-4 text-success" />
        <span className="font-medium">Infographic generated</span>
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass-subtle p-4 rounded-xl text-center">
            <div className={`${s.color} mx-auto mb-2`}>{s.icon}</div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Mock visual */}
      <div className="glass-subtle p-6 rounded-xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content Breakdown</p>
        {[
          { label: "Theory", pct: 45, color: "bg-primary" },
          { label: "Examples", pct: 30, color: "bg-success" },
          { label: "Formulas", pct: 15, color: "bg-warning" },
          { label: "References", pct: 10, color: "bg-info" },
        ].map((bar) => (
          <div key={bar.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{bar.label}</span><span className="text-muted-foreground">{bar.pct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${bar.color} rounded-full transition-all duration-1000`} style={{ width: `${bar.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export PNG</Button>
        <Button variant="outline" size="sm" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Export PDF</Button>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setDone(false)}><RotateCcw className="h-3.5 w-3.5" /> Redo</Button>
      </div>
    </div>
  );
}

// ─── Main Studio Component ──────────────────────────────────────────────────
export default function Studio() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileContext = searchParams.get("file");
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>(() =>
    fileContext ? [{ id: "ctx", name: fileContext, size: 1024000, type: "application/pdf" }] : []
  );

  const handleToolClick = (toolId: ToolId) => {
    if (toolId === "mentalmap") {
      navigate(`/knowledge-graph${fileContext ? `?file=${encodeURIComponent(fileContext)}` : ""}`);
      return;
    }
    setActiveTool(toolId);
  };

  const renderTool = () => {
    switch (activeTool) {
      case "audio": return <AudioTool files={files} />;
      case "presentation": return <PresentationTool files={files} />;
      case "video": return <VideoTool files={files} />;
      case "reports": return <ReportsTool files={files} />;
      case "infographics": return <InfographicsTool files={files} />;
      case "studio": return <div className="h-[600px] w-full"><Whiteboard roomId="studio-global" embedded /></div>;
      default: return null;
    }
  };

  const activeToolData = tools.find((t) => t.id === activeTool);

  // ── Tool detail view ──
  if (activeTool && activeTool !== "mentalmap") {
    return (
      <div className="animate-fade-in space-y-5 h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveTool(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Studio
          </Button>
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center ${activeToolData?.color}`}>
              {activeToolData?.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{activeToolData?.title}</h2>
            </div>
            {activeToolData?.badge && (
              <Badge variant="outline" className="text-[9px] border-warning/30 text-warning">{activeToolData.badge}</Badge>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll space-y-5">
          {/* File upload */}
          <div className="glass-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Source Files</p>
            <StudioFileUpload files={files} onFilesChange={setFiles} />
          </div>

          {/* Tool output */}
          <div className="glass-card p-5">
            {renderTool()}
          </div>
        </div>
      </div>
    );
  }

  // ── Grid view ──
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🎨 Studio</h1>
        <p className="text-muted-foreground mt-1">Transform your study materials with AI-powered tools</p>
      </div>

      {/* File context banner */}
      {fileContext && (
        <div className="glass-subtle p-3 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Working with: <span className="text-primary">{fileContext}</span></p>
            <p className="text-[11px] text-muted-foreground">Select a tool below to process this file</p>
          </div>
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
      )}

      {/* Upload area on main grid */}
      <div className="glass-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Upload Files First</p>
        <StudioFileUpload files={files} onFilesChange={setFiles} />
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`glass-card p-5 text-left group hover:scale-[1.02] transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 relative overflow-hidden ${
              files.length === 0 && tool.id !== "mentalmap" ? "opacity-60" : ""
            }`}
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-7 w-7 rounded-md bg-muted/80 flex items-center justify-center">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className={`h-12 w-12 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center ${tool.color}`}>
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{tool.title}</h3>
                  {tool.badge && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-warning/30 text-warning">{tool.badge}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Open tool</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
