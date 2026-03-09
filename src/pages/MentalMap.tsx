import { useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type MapNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  children?: MapNode[];
  expanded?: boolean;
};

const initialNodes: MapNode[] = [
  {
    id: "root", label: "Operating Systems", x: 450, y: 300, color: "hsl(217, 91%, 60%)",
    children: [
      {
        id: "proc", label: "Processes", x: 200, y: 150, color: "hsl(142, 76%, 42%)",
        children: [
          { id: "threads", label: "Threads", x: 80, y: 80, color: "hsl(142, 76%, 42%)" },
          { id: "sched", label: "Scheduling", x: 150, y: 50, color: "hsl(142, 76%, 42%)" },
        ],
      },
      {
        id: "mem", label: "Memory Mgmt", x: 700, y: 150, color: "hsl(38, 92%, 55%)",
        children: [
          { id: "virt", label: "Virtual Memory", x: 780, y: 70, color: "hsl(38, 92%, 55%)" },
          { id: "paging", label: "Paging", x: 850, y: 130, color: "hsl(38, 92%, 55%)" },
        ],
      },
      {
        id: "fs", label: "File Systems", x: 250, y: 450, color: "hsl(0, 70%, 55%)",
        children: [
          { id: "inodes", label: "Inodes", x: 120, y: 500, color: "hsl(0, 70%, 55%)" },
          { id: "dirs", label: "Directories", x: 200, y: 540, color: "hsl(0, 70%, 55%)" },
        ],
      },
      {
        id: "shell", label: "Shell & CLI", x: 650, y: 450, color: "hsl(199, 89%, 48%)",
        children: [
          { id: "bash", label: "Bash Scripts", x: 750, y: 500, color: "hsl(199, 89%, 48%)" },
          { id: "vars", label: "Variables", x: 600, y: 530, color: "hsl(199, 89%, 48%)" },
        ],
      },
    ],
  },
];

function flattenNodes(nodes: MapNode[], expanded: Set<string>): { node: MapNode; parent?: MapNode }[] {
  const result: { node: MapNode; parent?: MapNode }[] = [];
  for (const n of nodes) {
    result.push({ node: n });
    if (n.children && expanded.has(n.id)) {
      for (const child of n.children) {
        result.push({ node: child, parent: n });
        if (child.children && expanded.has(child.id)) {
          for (const gc of child.children) {
            result.push({ node: gc, parent: child });
          }
        }
      }
    }
  }
  return result;
}

export default function MentalMap() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileContext = searchParams.get("file");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const [hovered, setHovered] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allNodes = flattenNodes(initialNodes, expanded);

  const handleMouseDown = (e: React.MouseEvent) => {
    const tag = (e.target as SVGElement).tagName;
    if (tag === "svg" || tag === "line" || tag === "path") {
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
    <div className="animate-fade-in h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/studio")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Studio
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">🧠 Mental Map</h1>
            {fileContext && (
              <p className="text-xs text-muted-foreground">Context: <span className="text-primary">{fileContext}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 glass-card overflow-hidden rounded-xl relative">
        {/* Floating controls */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 bg-card/90 backdrop-blur-sm" onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-card/90 backdrop-blur-sm" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-card/90 backdrop-blur-sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <svg
          width="100%" height="100%"
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {allNodes.filter((n) => n.parent).map(({ node, parent }) => {
              if (!parent) return null;
              const mx = (parent.x + node.x) / 2;
              return (
                <path
                  key={`edge-${node.id}`}
                  d={`M ${parent.x} ${parent.y} Q ${mx} ${parent.y}, ${node.x} ${node.y}`}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={1.2}
                  strokeOpacity={hovered === node.id || hovered === parent.id ? 0.8 : 0.25}
                  style={{ transition: "stroke-opacity 0.3s ease" }}
                />
              );
            })}

            {/* Nodes */}
            {allNodes.map(({ node }) => {
              const isRoot = node.id === "root";
              const isHovered = hovered === node.id;
              const hasChildren = node.children && node.children.length > 0;
              const isExpanded = expanded.has(node.id);
              const w = isRoot ? 160 : 120;
              const h = isRoot ? 44 : 34;

              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onClick={() => hasChildren && toggleExpand(node.id)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Glow */}
                  {isHovered && (
                    <rect
                      x={node.x - w / 2 - 4} y={node.y - h / 2 - 4}
                      width={w + 8} height={h + 8}
                      rx={14} fill={node.color} fillOpacity={0.1}
                    />
                  )}
                  {/* Card */}
                  <rect
                    x={node.x - w / 2} y={node.y - h / 2}
                    width={w} height={h}
                    rx={10}
                    fill="hsl(var(--card))"
                    fillOpacity={0.95}
                    stroke={node.color}
                    strokeWidth={isRoot ? 2 : isHovered ? 1.5 : 0.5}
                    strokeOpacity={isHovered ? 1 : 0.5}
                    style={{ transition: "all 0.2s ease" }}
                  />
                  <text
                    x={node.x} y={node.y + (isRoot ? 1 : 0.5)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`fill-foreground ${isRoot ? "text-[13px] font-bold" : "text-[11px] font-medium"}`}
                    style={{ pointerEvents: "none" }}
                  >
                    {node.label}
                  </text>
                  {/* Expand indicator */}
                  {hasChildren && !isRoot && (
                    <circle
                      cx={node.x + w / 2 - 2} cy={node.y}
                      r={6} fill={node.color} fillOpacity={0.2}
                      stroke={node.color} strokeWidth={0.5}
                    >
                      <title>{isExpanded ? "Collapse" : "Expand"}</title>
                    </circle>
                  )}
                  {hasChildren && !isRoot && (
                    <text
                      x={node.x + w / 2 - 2} y={node.y + 1}
                      textAnchor="middle" dominantBaseline="middle"
                      className="text-[8px] fill-foreground font-bold"
                      style={{ pointerEvents: "none" }}
                    >
                      {isExpanded ? "−" : "+"}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
