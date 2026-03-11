import { useState, useCallback } from "react";
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  MarkerType,
  Handle,
  Position,
  NodeProps,
  Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, BookOpen, CheckCircle2, Lock, PlayCircle } from "lucide-react";

// --- Custom Node Implementation ---
const SubjectNode = ({ data }: NodeProps) => {
  const isLocked = data.status === "locked";
  const isCompleted = data.status === "completed";
  const isCurrent = data.status === "current";

  const statusColors = {
    completed: "bg-success/20 border-success/40 text-success",
    current: "bg-primary/20 border-primary/40 text-primary",
    locked: "bg-muted/50 border-border/40 text-muted-foreground grayscale",
  };

  const statusIcons = {
    completed: <CheckCircle2 className="h-3 w-3" />,
    current: <PlayCircle className="h-3 w-3" />,
    locked: <Lock className="h-3 w-3" />,
  };

  return (
    <div className={`px-4 py-3 rounded-xl border ${statusColors[data.status as keyof typeof statusColors]} backdrop-blur-md w-48 shadow-lg transition-transform hover:scale-105 cursor-pointer`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-muted-foreground border-none" />
      
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase tracking-wider bg-background/50 border-inherit text-inherit">
            {data.category as string}
          </Badge>
          <div className="opacity-80">
            {statusIcons[data.status as keyof typeof statusIcons]}
          </div>
        </div>
        
        <div className="font-semibold text-sm leading-tight text-foreground">
          {data.label as string}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-muted-foreground border-none" />
    </div>
  );
};

const nodeTypes = {
  subject: SubjectNode,
};

// --- Initial Data ---
const initialNodes = [
  // SEMESTER 1 (Level 1)
  { id: "1", type: "subject", position: { x: 0, y: 0 }, data: { label: "Basic Mathematics", category: "Math", status: "completed" } },
  { id: "2", type: "subject", position: { x: 300, y: 0 }, data: { label: "Programming", category: "CS", status: "completed" } },
  { id: "3", type: "subject", position: { x: 550, y: 0 }, data: { label: "Imperative Programming", category: "CS", status: "completed" } },
  { id: "4", type: "subject", position: { x: 800, y: 0 }, data: { label: "Computer Systems", category: "Systems", status: "completed" } },
  { id: "5", type: "subject", position: { x: 1050, y: 0 }, data: { label: "Functional Programming", category: "CS", status: "completed" } },

  // SEMESTER 2 (Level 2)
  { id: "6", type: "subject", position: { x: -100, y: 150 }, data: { label: "Analysis I", category: "Math", status: "current" } },
  { id: "7", type: "subject", position: { x: 150, y: 150 }, data: { label: "Discrete Mathematics", category: "Math", status: "current" } },
  { id: "8", type: "subject", position: { x: 400, y: 150 }, data: { label: "Algorithms & Data Structures I", category: "CS", status: "current" } },
  { id: "9", type: "subject", position: { x: 650, y: 150 }, data: { label: "Object Oriented Programming", category: "CS", status: "current" } },
  { id: "10", type: "subject", position: { x: 550, y: 280 }, data: { label: "Programming Languages", category: "CS", status: "locked" } },
  { id: "11", type: "subject", position: { x: 800, y: 150 }, data: { label: "Web Development", category: "Systems", status: "current" } },

  // SEMESTER 3 (Level 3)
  { id: "12", type: "subject", position: { x: -100, y: 300 }, data: { label: "Analysis II", category: "Math", status: "locked" } },
  { id: "13", type: "subject", position: { x: 150, y: 300 }, data: { label: "Application of Discrete Models", category: "Math", status: "locked" } },
  { id: "14", type: "subject", position: { x: 400, y: 300 }, data: { label: "Algorithms & Data Structures II", category: "CS", status: "locked" } },
  { id: "15", type: "subject", position: { x: 650, y: 300 }, data: { label: "Programming Technology", category: "CS", status: "locked" } },
  { id: "16", type: "subject", position: { x: 800, y: 300 }, data: { label: "Web Programming", category: "Systems", status: "locked" } },

  // SEMESTER 4 (Level 4)
  { id: "17", type: "subject", position: { x: -100, y: 450 }, data: { label: "Numerical Methods", category: "Math", status: "locked" } },
  { id: "18", type: "subject", position: { x: 150, y: 450 }, data: { label: "Theory of Computation I", category: "Math", status: "locked" } },
  { id: "19", type: "subject", position: { x: 400, y: 450 }, data: { label: "Databases I", category: "Systems", status: "locked" } },
  { id: "20", type: "subject", position: { x: 650, y: 450 }, data: { label: "Software Technology", category: "CS", status: "locked" } },
  { id: "21", type: "subject", position: { x: 800, y: 450 }, data: { label: "Operating Systems", category: "Systems", status: "locked" } },

  // SEMESTER 5 (Level 5)
  { id: "22", type: "subject", position: { x: -100, y: 600 }, data: { label: "Probability and Statistics", category: "Math", status: "locked" } },
  { id: "23", type: "subject", position: { x: 150, y: 600 }, data: { label: "Theory of Computation II", category: "Math", status: "locked" } },
  { id: "24", type: "subject", position: { x: 300, y: 600 }, data: { label: "Artificial Intelligence", category: "CS", status: "locked" } },
  { id: "25", type: "subject", position: { x: 500, y: 600 }, data: { label: "Databases II", category: "Systems", status: "locked" } },
  { id: "26", type: "subject", position: { x: 700, y: 600 }, data: { label: "Telecommunication Networks", category: "Systems", status: "locked" } },
  { id: "27", type: "subject", position: { x: 900, y: 600 }, data: { label: "Concurrent Programming", category: "CS", status: "locked" } },
];

const defaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--muted-foreground))" },
  style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 2, opacity: 0.5 },
};

const initialEdges: Edge[] = [
  // L1 -> L2
  { id: "e1-6", source: "1", target: "6", ...defaultEdgeOptions },
  { id: "e1-7", source: "1", target: "7", ...defaultEdgeOptions },
  { id: "e2-8", source: "2", target: "8", ...defaultEdgeOptions },
  { id: "e2-9", source: "2", target: "9", ...defaultEdgeOptions },
  { id: "e3-10", source: "3", target: "10", ...defaultEdgeOptions },
  { id: "e4-11", source: "4", target: "11", ...defaultEdgeOptions },

  // L2 -> L3
  { id: "e6-12", source: "6", target: "12", ...defaultEdgeOptions },
  { id: "e7-13", source: "7", target: "13", ...defaultEdgeOptions },
  { id: "e8-14", source: "8", target: "14", ...defaultEdgeOptions },
  { id: "e9-15", source: "9", target: "15", ...defaultEdgeOptions },
  { id: "e11-16", source: "11", target: "16", ...defaultEdgeOptions },

  // L3 -> L4
  { id: "e12-17", source: "12", target: "17", ...defaultEdgeOptions },
  { id: "e7-18", source: "7", target: "18", ...defaultEdgeOptions }, // Discrete Math -> ToC I
  { id: "e14-19", source: "14", target: "19", ...defaultEdgeOptions },
  { id: "e15-20", source: "15", target: "20", ...defaultEdgeOptions },
  { id: "e16-21", source: "16", target: "21", ...defaultEdgeOptions },

  // L4 -> L5
  { id: "e12-22", source: "12", target: "22", ...defaultEdgeOptions }, // Analysis II -> Prob & Stats
  { id: "e18-23", source: "18", target: "23", ...defaultEdgeOptions },
  { id: "e19-24", source: "19", target: "24", ...defaultEdgeOptions },
  { id: "e19-25", source: "19", target: "25", ...defaultEdgeOptions },
  
  // Mixed L3/L4 -> L5
  { id: "e10-26", source: "10", target: "26", ...defaultEdgeOptions }, // Prog Langs -> Telecom
  { id: "e10-27", source: "10", target: "27", ...defaultEdgeOptions }, // Prog Langs -> Concurrent Prog
  { id: "e21-27", source: "21", target: "27", ...defaultEdgeOptions }, // OS -> Concurrent Prog
];

export default function KnowledgeGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="animate-fade-in space-y-4 h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🗺️ Curriculum Roadmap</h1>
          <p className="text-muted-foreground mt-1">Track your progress and prerequisites</p>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Completed</div>
          <div className="flex items-center gap-1.5"><PlayCircle className="h-3.5 w-3.5 text-primary" /> Current</div>
          <div className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-muted-foreground" /> Locked</div>
        </div>
      </div>

      <div className="flex-1 glass-card overflow-hidden rounded-xl border border-border/40 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={defaultEdgeOptions}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="hsl(var(--muted-foreground))" gap={16} size={1} opacity={0.1} />
          <Controls className="bg-background/80 backdrop-blur-md border border-border/50 rounded-md overflow-hidden" showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedNode?.data.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 glass-subtle rounded-lg flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Status</span>
              <Badge variant="outline" className="capitalize">{selectedNode?.data.status}</Badge>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Available Resources</p>
              
              <div className="flex items-center gap-3 p-3 glass-subtle rounded-lg cursor-pointer hover:bg-muted/60 transition-colors">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Lecture Notes & Slides</p>
                  <p className="text-[11px] text-muted-foreground">3 files in The Vault</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">Open</Badge>
              </div>

              <div className="flex items-center gap-3 p-3 glass-subtle rounded-lg cursor-pointer hover:bg-muted/60 transition-colors">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Past Exams</p>
                  <p className="text-[11px] text-muted-foreground">2 exams available</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">Open</Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
