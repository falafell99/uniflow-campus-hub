import { useState, useCallback, KeyboardEvent, useEffect, useRef } from "react";
import { Bold, Heading1, Heading2, List, Code, Plus, Trash2, GripVertical, FileText, Cloud, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type BlockType = "paragraph" | "h1" | "h2" | "bullet" | "code";
type Block = { id: string; type: BlockType; content: string };

const defaultBlocks: Block[] = [
  { id: "1", type: "h1", content: "Linear Algebra — Study Notes" },
  { id: "2", type: "paragraph", content: "These are my personal notes for the Linear Algebra course at ELTE." },
  { id: "3", type: "h2", content: "Key Concepts" },
  { id: "4", type: "bullet", content: "A vector space satisfies 8 axioms" },
  { id: "5", type: "bullet", content: "Eigenvalues satisfy det(A - λI) = 0" },
  { id: "6", type: "code", content: "import numpy as np\neigenvalues, _ = np.linalg.eig(A)" },
];

const typeStyles: Record<BlockType, string> = {
  h1: "text-2xl font-bold",
  h2: "text-lg font-semibold",
  paragraph: "text-sm",
  bullet: "text-sm pl-4 before:content-['•'] before:mr-2 before:text-primary",
  code: "text-sm font-mono bg-muted/60 p-3 rounded-lg border border-border/40",
};

export default function Workspace() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>(defaultBlocks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [noteId, setNoteId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes on mount
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setNoteId(data.id);
        if (data.blocks && Array.isArray(data.blocks) && data.blocks.length > 0) {
          setBlocks(data.blocks as Block[]);
        }
      }
    };
    load();
  }, [user]);

  // Auto-save with debounce
  const save = useCallback(async (blocksToSave: Block[]) => {
    if (!user) return;
    setSaveStatus("saving");
    if (noteId) {
      await supabase.from("notes").update({ blocks: blocksToSave, updated_at: new Date().toISOString() }).eq("id", noteId);
    } else {
      const { data } = await supabase.from("notes").insert({ user_id: user.id, blocks: blocksToSave }).select().single();
      if (data) setNoteId(data.id);
    }
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [user, noteId]);

  const triggerSave = (newBlocks: Block[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(newBlocks), 800);
  };

  const updateBlock = (id: string, content: string) => {
    const updated = blocks.map((b) => (b.id === id ? { ...b, content } : b));
    setBlocks(updated);
    triggerSave(updated);
  };

  const changeType = (id: string, type: BlockType) => {
    const updated = blocks.map((b) => (b.id === id ? { ...b, type } : b));
    setBlocks(updated);
    triggerSave(updated);
    setShowToolbar(null);
  };

  const addBlock = useCallback((afterId: string) => {
    const newBlock: Block = { id: Date.now().toString(), type: "paragraph", content: "" };
    setBlocks((b) => {
      const idx = b.findIndex((bl) => bl.id === afterId);
      const next = [...b];
      next.splice(idx + 1, 0, newBlock);
      triggerSave(next);
      return next;
    });
    setTimeout(() => setEditingId(newBlock.id), 50);
  }, [blocks, triggerSave]);

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) return;
    const updated = blocks.filter((b) => b.id !== id);
    setBlocks(updated);
    triggerSave(updated);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, block: Block) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addBlock(block.id); }
    if (e.key === "Backspace" && block.content === "") { e.preventDefault(); removeBlock(block.id); }
  };

  return (
    <div className="animate-fade-in h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📝 Workspace</h1>
          <p className="text-muted-foreground mt-1">Your personal notes — auto-saved to cloud</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> {blocks.length} blocks
          </Button>
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all ${
            saveStatus === "saving" ? "text-primary" :
            saveStatus === "saved" ? "text-success" : "text-muted-foreground"
          }`}>
            {saveStatus === "saving" ? <Cloud className="h-3.5 w-3.5 animate-pulse" /> :
             saveStatus === "saved" ? <Check className="h-3.5 w-3.5" /> :
             <Cloud className="h-3.5 w-3.5" />}
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Cloud sync"}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll">
        <div className="max-w-2xl mx-auto space-y-1 pb-32">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="group relative flex items-start gap-1"
              onMouseEnter={() => setShowToolbar(block.id)}
              onMouseLeave={() => setShowToolbar(null)}
            >
              <div className={`flex items-center gap-0.5 pt-1 transition-opacity ${showToolbar === block.id ? "opacity-100" : "opacity-0"}`}>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addBlock(block.id)}>
                  <Plus className="h-3 w-3" />
                </Button>
                <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
              </div>

              <div className="flex-1 min-w-0">
                {editingId === block.id ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-0.5 glass-subtle p-1 rounded-md w-fit">
                      {(
                        [
                          ["h1", <Heading1 className="h-3.5 w-3.5" />],
                          ["h2", <Heading2 className="h-3.5 w-3.5" />],
                          ["paragraph", <Bold className="h-3.5 w-3.5" />],
                          ["bullet", <List className="h-3.5 w-3.5" />],
                          ["code", <Code className="h-3.5 w-3.5" />],
                        ] as [BlockType, React.ReactNode][]
                      ).map(([t, icon]) => (
                        <Button key={t} variant={block.type === t ? "default" : "ghost"} size="icon" className="h-6 w-6" onClick={() => changeType(block.id, t)}>
                          {icon}
                        </Button>
                      ))}
                      <div className="w-px h-4 bg-border mx-1" />
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeBlock(block.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea
                      autoFocus
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => handleKeyDown(e, block)}
                      className={`border-0 bg-transparent resize-none p-0 focus-visible:ring-0 min-h-0 ${typeStyles[block.type]}`}
                      rows={block.type === "code" ? 4 : 1}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingId(block.id)}
                    className={`cursor-text rounded px-1 py-0.5 hover:bg-muted/40 transition-colors ${typeStyles[block.type]} ${!block.content ? "text-muted-foreground italic" : ""}`}
                  >
                    {block.content || "Click to type..."}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="pt-4 pl-8">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={() => addBlock(blocks[blocks.length - 1].id)}>
              <Plus className="h-3.5 w-3.5" /> Add block
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
