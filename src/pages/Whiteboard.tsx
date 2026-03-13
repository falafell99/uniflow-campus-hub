import { useState, useRef, useCallback, useEffect } from "react";
import { 
  ZoomIn, ZoomOut, Maximize2, ChevronLeft, 
  Square, StickyNote, Type, MousePointer2, 
  Trash2, Download, Eraser, Palette, 
  Undo, Redo, Plus, Minus, Pencil,
  ArrowUpRight, Circle, User, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type ElementType = "sticky" | "shape" | "text" | "path" | "arrow" | "circle";

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // Used for text or SVG path data
  color: string;
  rotation: number;
  strokeWidth?: number;
}

const COLORS = [
  "#FFEB3B", "#FFCDD2", "#C8E6C9", "#BBDEFB", "#E1BEE7", "#F5F5F5", "#212121"
];

interface WhiteboardProps {
  roomId?: string; // Backwards compatibility
  teamId?: string; // Preferred
  embedded?: boolean;
}

interface PresenceUser {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  lastUpdate: number;
}

export default function Whiteboard({ roomId, teamId, embedded = false }: WhiteboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasElement[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ElementType | "select" | "eraser">("select");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [currentColor, setCurrentColor] = useState("#FFEB3B");
  
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, PresenceUser>>({});
  const [activeTeamId, setActiveTeamId] = useState<string | null>(teamId || roomId || null);

  const pushToHistory = (newElements: CanvasElement[]) => {
    setHistory(prev => [...prev, elements]);
    setRedoStack([]);
    setElements(newElements);
    saveToSupabase(newElements);
  };

  const saveToSupabase = async (newElements: CanvasElement[]) => {
    if (!roomId) return;
    try {
      await supabase.from("whiteboards").upsert({
        id: roomId,
        elements: newElements,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Failed to save whiteboard:", e);
    }
  };

  useEffect(() => {
    if (!activeTeamId) return;

    const channelId = `whiteboard:${activeTeamId}`;
    
    // Load initial data
    const loadData = async () => {
      const { data } = await supabase
        .from("whiteboards")
        .select("elements")
        .eq("team_id", activeTeamId)
        .maybeSingle();

      if (data && data.elements) {
        setElements(data.elements as CanvasElement[]);
      }
    };
    loadData();

    // Setup Channel
    const channel = supabase.channel(channelId, {
      config: {
        presence: { key: user?.id || 'anon' }
      }
    });

    channel
      // Sync board data
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'whiteboards', 
        filter: `team_id=eq.${activeTeamId}` 
      }, payload => {
        if (payload.new && payload.new.elements) {
          // Only update if we are not actively drawing to avoid jitters
          if (!isDrawing && !isDragging) {
            setElements(payload.new.elements as CanvasElement[]);
          }
        }
      })
      // Real-time broadcast for smooth drawing
      .on('broadcast', { event: 'draw' }, ({ payload }) => {
        setElements(prev => {
          const exists = prev.find(el => el.id === payload.id);
          if (exists) {
            return prev.map(el => el.id === payload.id ? { ...el, content: payload.content } : el);
          }
          return [...prev, payload];
        });
      })
      // Presence for cursors
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const cursors: Record<string, PresenceUser> = {};
        Object.keys(state).forEach(key => {
          if (key === user?.id) return;
          const presence = state[key][0] as any;
          if (presence.x !== undefined) {
            cursors[key] = presence;
          }
        });
        setRemoteCursors(cursors);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log("Joined:", key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setRemoteCursors(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({
            id: user.id,
            name: user.user_metadata?.display_name || 'User',
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            x: 0,
            y: 0,
            lastUpdate: Date.now()
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [activeTeamId, user]);

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [...prev, elements]);
    setHistory(prev => prev.slice(0, -1));
    setElements(previous);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, elements]);
    setRedoStack(prev => prev.slice(0, -1));
    setElements(next);
  };

  const getRelativeCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  };

  const addElement = (type: ElementType) => {
    const id = Math.random().toString(36).substr(2, 9);
    const x = (-pan.x + window.innerWidth / 2) / zoom - 50;
    const y = (-pan.y + window.innerHeight / 2) / zoom - 50;
    
    const newElement: CanvasElement = {
      id,
      type,
      x,
      y,
      width: type === "sticky" ? 150 : 100,
      height: type === "sticky" ? 150 : 100,
      content: type === "text" ? "Type here..." : type === "arrow" ? "arrow" : "",
      color: type === "sticky" ? "#FFEB3B" : "#BBDEFB",
      rotation: 0
    };
    
    pushToHistory([...elements, newElement]);
    setSelectedId(id);
    setTool("select");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getRelativeCoords(e);
    const target = e.target as SVGElement;
    const elementId = target.getAttribute("data-element-id");

    if (tool === "eraser") {
      if (elementId) {
        pushToHistory(elements.filter(el => el.id !== elementId));
        if (selectedId === elementId) setSelectedId(null);
      }
      return;
    }

    if (tool === "path") {
      const id = Math.random().toString(36).substr(2, 9);
      const newPath: CanvasElement = {
        id,
        type: "path",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        content: `M ${coords.x} ${coords.y}`,
        color: currentColor,
        rotation: 0,
        strokeWidth: 3
      };
      // We don't push to history on mouse down for path, but on mouse up
      setElements([...elements, newPath]);
      setSelectedId(id);
      setIsDrawing(true);

      // Broadcast the start of a path
      channelRef.current?.send({
        type: 'broadcast',
        event: 'draw',
        payload: newPath
      });
      return;
    }

    if (tool !== "select") return;
    
    if (elementId) {
      const element = elements.find(el => el.id === elementId);
      if (element) {
        setSelectedId(elementId);
        setIsDragging(true);
        setDragOffset({
          x: coords.x - element.x,
          y: coords.y - element.y
        });
      }
    } else {
      setSelectedId(null);
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDrawing && selectedId) {
      const coords = getRelativeCoords(e);
      const updatedElements = prev => prev.map(el => {
        if (el.id === selectedId) {
          const newContent = el.content + ` L ${coords.x} ${coords.y}`;
          // Broadcast during drawing for real-time feel
          channelRef.current?.send({
            type: 'broadcast',
            event: 'draw',
            payload: { ...el, content: newContent }
          });
          return { ...el, content: newContent };
        }
        return el;
      });
      setElements(updatedElements);
      return;
    }

    // Track cursor presence
    if (channelRef.current && user) {
      channelRef.current.track({
        id: user.id,
        name: user.user_metadata?.display_name || 'User',
        color: currentColor, // Or a fixed color per user
        x: e.clientX,
        y: e.clientY,
        lastUpdate: Date.now()
      });
    }

    if (isDragging && selectedId) {
      const coords = getRelativeCoords(e);
      setElements(prev => prev.map(el => 
        el.id === selectedId 
          ? { ...el, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }
          : el
      ));
    } else if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, isPanning, isDrawing, selectedId, dragOffset, dragStart, pan, zoom, user, currentColor]);

  const handleMouseUp = () => {
    if (isDrawing || isDragging) {
      // Capture state for history when finishing a drag or draw
      const nextElements = elements.map(el => 
        el.id === selectedId && isDragging 
          ? { ...el } 
          : el
      );
      setHistory(prev => [...prev, nextElements]);
      setRedoStack([]);
      saveToSupabase(nextElements);
    }
    setIsDragging(false);
    setIsPanning(false);
    setIsDrawing(false);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove]);

  const updateElementContent = (id: string, content: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, content } : el));
  };

  const deleteSelected = () => {
    if (selectedId) {
      pushToHistory(elements.filter(el => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  const changeColor = (color: string) => {
    setCurrentColor(color);
    if (selectedId) {
      pushToHistory(elements.map(el => el.id === selectedId ? { ...el, color } : el));
    }
  };

  return (
    <div className={`animate-fade-in flex flex-col relative overflow-hidden bg-[#121212] ${embedded ? "h-full rounded-2xl border border-border/40 shadow-2xl" : "h-[calc(100vh-5rem)]"}`}>
      {/* Header */}
      <div className={`absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none ${embedded ? "px-2" : ""}`}>
        <div className="flex items-center gap-3 pointer-events-auto">
          {!embedded && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/studio")} className="bg-background/80 backdrop-blur-md">
              <ChevronLeft className="h-4 w-4 mr-1" /> Studio
            </Button>
          )}
          <div className="px-3 py-1.5 bg-background/80 backdrop-blur-md rounded-lg border border-border/40 shadow-sm">
            <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
              🎨 Whiteboard
            </h1>
          </div>
        </div>

        {/* Floating Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-background/80 backdrop-blur-md rounded-xl border border-border/40 shadow-xl pointer-events-auto">
          <Button 
            variant={tool === "select" ? "default" : "ghost"} 
            size="icon" 
            className="h-9 w-9"
            onClick={() => setTool("select")}
          >
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button 
            variant={tool === "path" ? "default" : "ghost"} 
            size="icon" 
            className="h-9 w-9"
            onClick={() => setTool("path")}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant={tool === "eraser" ? "default" : "ghost"} 
            size="icon" 
            className="h-9 w-9"
            onClick={() => setTool("eraser")}
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <div className="w-[1px] h-4 bg-border/40 mx-1" />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => addElement("sticky")} title="Sticky Note">
            <StickyNote className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => addElement("shape")} title="Rectangle">
            <Square className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => addElement("circle")} title="Circle">
            <Circle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => addElement("arrow")} title="Arrow">
            <ArrowUpRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => addElement("text")} title="Text Box">
            <Type className="h-4 w-4" />
          </Button>
          <div className="w-[1px] h-4 bg-border/40 mx-1" />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={undo} disabled={history.length === 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={redo} disabled={redoStack.length === 0}>
            <Redo className="h-4 w-4" />
          </Button>
          <div className="w-[1px] h-4 bg-border/40 mx-1" />
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={deleteSelected} disabled={!selectedId}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!selectedId}>
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="flex gap-1 p-2 min-w-0">
              {COLORS.map(c => (
                <button 
                  key={c}
                  className="h-6 w-6 rounded-full border border-border/20 shadow-inner"
                  style={{ backgroundColor: c }}
                  onClick={() => changeColor(c)}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2 pointer-events-auto">
           <div className="flex p-0.5 bg-background/80 backdrop-blur-md rounded-lg border border-border/40 shadow-sm">
             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => z / 1.2)}><Minus className="h-3 w-3" /></Button>
             <div className="flex items-center px-2 text-[10px] font-bold min-w-[40px] justify-center">{Math.round(zoom * 100)}%</div>
             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => z * 1.2)}><Plus className="h-3 w-3" /></Button>
           </div>
        </div>
      </div>

      {/* Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-get active:cursor-grabbing bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] bg-[size:20px_20px]"
        onMouseDown={handleMouseDown}
        style={{ touchAction: "none" }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {elements.map((el) => {
            const isSelected = selectedId === el.id;
            
            return (
              <g 
                key={el.id} 
                className="group cursor-move transition-transform"
              >
                {el.type === "sticky" && (
                  <foreignObject
                    x={el.x} y={el.y}
                    width={el.width} height={el.height}
                    className="overflow-visible"
                    data-element-id={el.id}
                  >
                    <div 
                       className={`w-full h-full p-4 shadow-xl flex flex-col transition-all border-l-[3px]
                         ${isSelected ? "ring-2 ring-[#7b68ee] scale-[1.02]" : "ring-0 ring-transparent"}`}
                       style={{ 
                         backgroundColor: el.color,
                         color: "#333",
                         transform: `rotate(${el.rotation}deg)`,
                         borderLeftColor: "rgba(0,0,0,0.1)"
                       }}
                       onMouseDown={(e) => {
                         // Stop propagation so it doesn't trigger canvas drag
                         e.stopPropagation();
                       }}
                    >
                       <textarea
                         className="w-full h-full bg-transparent border-none outline-none resize-none text-sm font-medium leading-relaxed uppercase tracking-tighter placeholder:text-black/20"
                         placeholder="Start typing..."
                         value={el.content}
                         onChange={(e) => updateElementContent(el.id, e.target.value)}
                         onMouseDown={(e) => {
                           // Allow selection and typing
                           e.stopPropagation();
                           setSelectedId(el.id);
                         }}
                       />
                       {/* Transparent overlay for handle drag when not focused */}
                       <div 
                         className="absolute inset-0 cursor-move pointer-events-none" 
                         data-element-id={el.id}
                        />
                    </div>
                  </foreignObject>
                )}

                {el.type === "shape" && (
                  <rect
                    x={el.x} y={el.y}
                    width={el.width} height={el.height}
                    rx={8}
                    fill={el.color}
                    fillOpacity={0.2}
                    stroke={el.color}
                    strokeWidth={isSelected ? 3 : 2}
                    data-element-id={el.id}
                    className="transition-all"
                  />
                )}

                {el.type === "circle" && (
                  <ellipse
                    cx={el.x + el.width/2} cy={el.y + el.height/2}
                    rx={el.width/2} ry={el.height/2}
                    fill={el.color}
                    fillOpacity={0.2}
                    stroke={el.color}
                    strokeWidth={isSelected ? 3 : 2}
                    data-element-id={el.id}
                    className="transition-all"
                  />
                )}

                {el.type === "arrow" && (
                  <g data-element-id={el.id}>
                    <defs>
                      <marker
                        id={`arrowhead-${el.id}`}
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3.5, 0 7" fill={el.color} />
                      </marker>
                    </defs>
                    <line
                      x1={el.x} y1={el.y}
                      x2={el.x + el.width} y2={el.y + el.height}
                      stroke={el.color}
                      strokeWidth={isSelected ? 4 : 2}
                      markerEnd={`url(#arrowhead-${el.id})`}
                      className="transition-all"
                    />
                  </g>
                )}

                {el.type === "text" && (
                  <foreignObject
                    x={el.x} y={el.y}
                    width={200} height={40}
                    className="overflow-visible"
                    data-element-id={el.id}
                  >
                    <input
                      className={`bg-transparent border-none outline-none text-lg font-bold w-full p-1
                        ${isSelected ? "text-primary border-b-2 border-primary" : "text-foreground"}`}
                      value={el.content}
                      onChange={(e) => updateElementContent(el.id, e.target.value)}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedId(el.id);
                      }}
                      placeholder="Enter text..."
                    />
                  </foreignObject>
                )}

                {el.type === "path" && (
                  <path
                    d={el.content}
                    fill="none"
                    stroke={el.color}
                    strokeWidth={isSelected ? el.strokeWidth! + 2 : el.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    data-element-id={el.id}
                    className="transition-all"
                  />
                )}
              </g>
            );
          })}

          {/* Remote Cursors */}
          {Object.entries(remoteCursors).map(([id, cursor]) => {
            // Adjust cursor position to be relative to the canvas
            if (!svgRef.current) return null;
            const rect = svgRef.current.getBoundingClientRect();
            const relX = (cursor.x - rect.left - pan.x) / zoom;
            const relY = (cursor.y - rect.top - pan.y) / zoom;

            return (
              <g key={id} transform={`translate(${relX}, ${relY})`}>
                <MousePointer2 
                  className="h-5 w-5 fill-current" 
                  style={{ color: cursor.color }} 
                  stroke="white"
                  strokeWidth={1.5}
                />
                <foreignObject x={12} y={12} width={100} height={20}>
                  <div 
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap shadow-sm"
                    style={{ backgroundColor: cursor.color }}
                  >
                    {cursor.name}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* Helper text */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-background/50 backdrop-blur-md rounded-full border border-border/20 text-[10px] text-muted-foreground uppercase tracking-widest pointer-events-none">
        Drag to pan • Click to select • Use toolbar to add elements
      </div>
    </div>
  );
}
