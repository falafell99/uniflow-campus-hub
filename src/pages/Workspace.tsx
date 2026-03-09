import { useState, useCallback, KeyboardEvent } from "react";
import { Bold, Italic, Heading1, Heading2, List, Code, Plus, Trash2, GripVertical, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type BlockType = "paragraph" | "h1" | "h2" | "bullet" | "code";
type Block = { id: string; type: BlockType; content: string };

const defaultBlocks: Block[] = [
  { id: "1", type: "h1", content: "Linear Algebra — Study Notes" },
  { id: "2", type: "paragraph", content: "These are my personal notes for the Linear Algebra course at ELTE. Focus areas include eigenvalues, matrix decomposition, and vector spaces." },
  { id: "3", type: "h2", content: "Key Concepts" },
  { id: "4", type: "bullet", content: "A vector space is a set with addition and scalar multiplication satisfying 8 axioms" },
  { id: "5", type: "bullet", content: "Linear independence: no vector can be written as a combination of others" },
  { id: "6", type: "bullet", content: "Eigenvalues satisfy det(A - λI) = 0" },
  { id: "7", type: "h2", content: "Code Example" },
  { id: "8", type: "code", content: "import numpy as np\nA = np.array([[2, 1], [1, 2]])\neigenvalues, eigenvectors = np.linalg.eig(A)\nprint(eigenvalues)  # [3. 1.]" },
];

const typeStyles: Record<BlockType, string> = {
  h1: "text-2xl font-bold",
  h2: "text-lg font-semibold",
  paragraph: "text-sm",
  bullet: "text-sm pl-4 before:content-['•'] before:mr-2 before:text-primary",
  code: "text-sm font-mono bg-muted/60 p-3 rounded-lg border border-border/40",
};

export default function Workspace() {
  const [blocks, setBlocks] = useState<Block[]>(defaultBlocks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState<string | null>(null);

  const updateBlock = (id: string, content: string) => {
    setBlocks((b) => b.map((bl) => bl.id === id ? { ...bl, content } : bl));
  };

  const changeType = (id: string, type: BlockType) => {
    setBlocks((b) => b.map((bl) => bl.id === id ? { ...bl, type } : bl));
    setShowToolbar(null);
  };

  const addBlock = (afterId: string) => {
    const newBlock: Block = { id: Date.now().toString(), type: "paragraph", content: "" };
    setBlocks((b) => {
      const idx = b.findIndex((bl) => bl.id === afterId);
      const next = [...b];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    setTimeout(() => setEditingId(newBlock.id), 50);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) return;
    setBlocks((b) => b.filter((bl) => bl.id !== id));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, block: Block) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBlock(block.id);
    }
    if (e.key === "Backspace" && block.content === "") {
      e.preventDefault();
      removeBlock(block.id);
    }
  };

  return (
    <div className="animate-fade-in h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📝 Workspace</h1>
          <p className="text-muted-foreground mt-1">Your personal Notion-style notes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> {blocks.length} blocks
          </Button>
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
              {/* Side controls */}
              <div className={`flex items-center gap-0.5 pt-1 transition-opacity ${showToolbar === block.id ? "opacity-100" : "opacity-0"}`}>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addBlock(block.id)}>
                  <Plus className="h-3 w-3" />
                </Button>
                <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
              </div>

              {/* Block */}
              <div className="flex-1 min-w-0">
                {editingId === block.id ? (
                  <div className="space-y-1">
                    {/* Formatting toolbar */}
                    <div className="flex items-center gap-0.5 glass-subtle p-1 rounded-md w-fit">
                      {([
                        ["h1", <Heading1 className="h-3.5 w-3.5" />],
                        ["h2", <Heading2 className="h-3.5 w-3.5" />],
                        ["paragraph", <Bold className="h-3.5 w-3.5" />],
                        ["bullet", <List className="h-3.5 w-3.5" />],
                        ["code", <Code className="h-3.5 w-3.5" />],
                      ] as [BlockType, React.ReactNode][]).map(([t, icon]) => (
                        <Button
                          key={t}
                          variant={block.type === t ? "default" : "ghost"}
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => changeType(block.id, t)}
                        >
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

          {/* Add block button */}
          <div className="pt-4 pl-8">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1.5"
              onClick={() => addBlock(blocks[blocks.length - 1].id)}
            >
              <Plus className="h-3.5 w-3.5" /> Add block
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
