import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type GraphNode = {
  id: string; label: string; x: number; y: number;
  category: "math" | "cs" | "ai" | "systems";
  docs: { title: string; type: string }[];
};

type Edge = { from: string; to: string };

const nodes: GraphNode[] = [
  { id: "la", label: "Linear Algebra", x: 200, y: 150, category: "math", docs: [{ title: "Lecture Notes — Prof. Kovács", type: "PDF" }, { title: "Matrix Theory Summary", type: "Notes" }] },
  { id: "calc", label: "Calculus", x: 400, y: 100, category: "math", docs: [{ title: "Calculus I Complete", type: "PDF" }, { title: "Integration Techniques", type: "Notes" }] },
  { id: "prob", label: "Probability", x: 350, y: 280, category: "math", docs: [{ title: "Probability & Statistics", type: "PDF" }] },
  { id: "algo", label: "Algorithms", x: 550, y: 200, category: "cs", docs: [{ title: "Algorithm Design Manual", type: "PDF" }, { title: "Sorting Cheat Sheet", type: "Notes" }] },
  { id: "ds", label: "Data Structures", x: 600, y: 350, category: "cs", docs: [{ title: "DS & Algorithms", type: "PDF" }] },
  { id: "nn", label: "Neural Networks", x: 150, y: 320, category: "ai", docs: [{ title: "Deep Learning Intro", type: "PDF" }, { title: "Backprop Explained", type: "Notes" }] },
  { id: "ml", label: "Machine Learning", x: 300, y: 420, category: "ai", docs: [{ title: "ML Fundamentals", type: "PDF" }] },
  { id: "db", label: "Databases", x: 700, y: 150, category: "systems", docs: [{ title: "SQL & Normalization", type: "PDF" }] },
  { id: "os", label: "Operating Systems", x: 750, y: 300, category: "systems", docs: [{ title: "OS Concepts", type: "PDF" }] },
  { id: "raft", label: "Raft Algorithm", x: 550, y: 450, category: "systems", docs: [{ title: "Raft Consensus Paper", type: "Paper" }] },
];

const edges: Edge[] = [
  { from: "la", to: "nn" }, { from: "la", to: "calc" }, { from: "la", to: "prob" },
  { from: "calc", to: "prob" }, { from: "calc", to: "algo" },
  { from: "prob", to: "ml" }, { from: "nn", to: "ml" },
  { from: "algo", to: "ds" }, { from: "algo", to: "raft" },
  { from: "ds", to: "db" }, { from: "ds", to: "os" },
  { from: "db", to: "os" }, { from: "os", to: "raft" },
];

const catColors: Record<string, string> = {
  math: "hsl(217, 91%, 60%)",
  cs: "hsl(142, 76%, 42%)",
  ai: "hsl(38, 92%, 55%)",
  systems: "hsl(0, 70%, 55%)",
};

const catBg: Record<string, string> = {
  math: "bg-primary/10 border-primary/30 text-primary",
  cs: "bg-success/10 border-success/30 text-success",
  ai: "bg-warning/10 border-warning/30 text-warning",
  systems: "bg-destructive/10 border-destructive/30 text-destructive",
};

export default function KnowledgeGraph() {
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === "svg" || (e.target as SVGElement).tagName === "line") {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);
  const handleMouseUp = () => setDragging(false);

  return (
    <div className="animate-fade-in space-y-4 h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🧠 Knowledge Graph</h1>
          <p className="text-muted-foreground mt-1">Explore how your subjects connect</p>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries({ math: "Math", cs: "CS", ai: "AI", systems: "Systems" }).map(([k, v]) => (
            <Badge key={k} variant="outline" className={`text-[10px] ${catBg[k]}`}>{v}</Badge>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 glass-card overflow-hidden rounded-xl cursor-grab active:cursor-grabbing">
        <svg
          ref={svgRef}
          width="100%" height="100%"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map((e, i) => {
              const from = nodes.find((n) => n.id === e.from)!;
              const to = nodes.find((n) => n.id === e.to)!;
              const isHighlighted = hovered === e.from || hovered === e.to;
              return (
                <line
                  key={i}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={isHighlighted ? "hsl(217, 91%, 60%)" : "hsl(215, 16%, 47%)"}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeOpacity={isHighlighted ? 0.8 : 0.25}
                  style={{ transition: "all 0.3s ease" }}
                />
              );
            })}
            {/* Nodes */}
            {nodes.map((node) => {
              const isHovered = hovered === node.id;
              const color = catColors[node.category];
              return (
                <g
                  key={node.id}
                  onClick={() => setSelected(node)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                  style={{ transition: "transform 0.2s ease" }}
                >
                  {/* Glow */}
                  {isHovered && (
                    <circle cx={node.x} cy={node.y} r={32} fill={color} fillOpacity={0.15} />
                  )}
                  <circle
                    cx={node.x} cy={node.y}
                    r={isHovered ? 24 : 20}
                    fill={color}
                    fillOpacity={isHovered ? 0.25 : 0.15}
                    stroke={color}
                    strokeWidth={isHovered ? 2 : 1.5}
                    strokeOpacity={isHovered ? 1 : 0.5}
                    style={{ transition: "all 0.2s ease" }}
                  />
                  <text
                    x={node.x} y={node.y + 36}
                    textAnchor="middle"
                    className="text-[11px] font-medium fill-foreground"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Node detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full`} style={{ backgroundColor: selected ? catColors[selected.category] : undefined }} />
              {selected?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Related Documents</p>
            {selected?.docs.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 p-3 glass-subtle rounded-lg hover:bg-muted/60 cursor-pointer transition-colors">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-[11px] text-muted-foreground">{doc.type}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Open</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
