import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Save, Users, Hash, List, Code, Minus, Type,
  ChevronRight, Loader2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── Block Types ─────────────────────────────────────────────────────────────
type BlockType = "paragraph" | "h1" | "h2" | "h3" | "bullet" | "code" | "divider";

interface Block {
  id: string;
  type: BlockType;
  content: string;
}

interface LiveNote {
  id: string;
  title: string;
  content: Block[];
  subject?: string;
  created_by?: string;
  updated_at: string;
}

interface LiveNoteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: { id: string; title: string } | null; // null = create new
}

// ─── Slash command definitions ───────────────────────────────────────────────
const SLASH_COMMANDS = [
  { icon: Type, label: "Text", description: "Plain paragraph", type: "paragraph" as BlockType },
  { icon: Hash, label: "Heading 1", description: "Large heading", type: "h1" as BlockType },
  { icon: Hash, label: "Heading 2", description: "Medium heading", type: "h2" as BlockType },
  { icon: Hash, label: "Heading 3", description: "Small heading", type: "h3" as BlockType },
  { icon: List, label: "Bullet List", description: "Unordered list item", type: "bullet" as BlockType },
  { icon: Code, label: "Code Block", description: "Monospace code", type: "code" as BlockType },
  { icon: Minus, label: "Divider", description: "Horizontal line", type: "divider" as BlockType },
];

function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Block renderer ───────────────────────────────────────────────────────────
function BlockEditor({
  block,
  onUpdate,
  onKeyDown,
  autoFocus,
  inputRef,
}: {
  block: Block;
  onUpdate: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  autoFocus?: boolean;
  inputRef?: (el: HTMLElement | null) => void;
}) {
  const baseClass = "w-full bg-transparent outline-none focus:ring-0 border-none resize-none leading-relaxed min-h-[1.5em]";

  if (block.type === "divider") {
    return <hr className="border-border/50 my-2" onClick={(e) => e.currentTarget.focus()} />;
  }

  if (block.type === "code") {
    return (
      <textarea
        value={block.content}
        onChange={e => onUpdate(e.target.value)}
        onKeyDown={onKeyDown as any}
        autoFocus={autoFocus}
        ref={el => inputRef?.(el)}
        className={`${baseClass} font-mono text-sm bg-muted/40 rounded-lg border border-border/40 p-3 text-green-400`}
        rows={Math.max(2, block.content.split("\n").length)}
        placeholder="// your code here..."
      />
    );
  }

  const typeClasses: Record<BlockType, string> = {
    paragraph: "text-sm text-foreground",
    h1: "text-3xl font-black tracking-tight",
    h2: "text-2xl font-bold tracking-tight",
    h3: "text-lg font-semibold",
    bullet: "text-sm text-foreground pl-5",
    code: "",
    divider: "",
  };

  const placeholder: Record<BlockType, string> = {
    paragraph: "Type something... (use / for commands)",
    h1: "Heading 1",
    h2: "Heading 2",
    h3: "Heading 3",
    bullet: "List item",
    code: "",
    divider: "",
  };

  return (
    <div className="relative flex items-start">
      {block.type === "bullet" && <span className="absolute left-0 mt-[0.35em] text-muted-foreground select-none">•</span>}
      <textarea
        value={block.content}
        onChange={e => onUpdate(e.target.value)}
        onKeyDown={onKeyDown as any}
        autoFocus={autoFocus}
        ref={el => inputRef?.(el)}
        className={`${baseClass} ${typeClasses[block.type]} placeholder:text-muted-foreground/40 overflow-hidden`}
        rows={1}
        placeholder={block.content === "" ? placeholder[block.type] : ""}
        style={{ height: "auto" }}
        onInput={e => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        }}
      />
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────
export function LiveNoteEditor({ open, onOpenChange, note: initialNote }: LiveNoteEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("Untitled Note");
  const [blocks, setBlocks] = useState<Block[]>([{ id: genId(), type: "paragraph", content: "" }]);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ blockId: string; query: string } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  const channelRef = useRef<any>(null);
  const inputRefs = useRef<Record<string, HTMLElement | null>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load existing note or create new ────────────────────────────────────
  useEffect(() => {
    if (!open || !user) return;

    if (initialNote?.id) {
      setNoteId(initialNote.id);
      setTitle(initialNote.title);
      supabase
        .from("live_notes")
        .select("*")
        .eq("id", initialNote.id)
        .single()
        .then(({ data }) => {
          if (data?.content) setBlocks(data.content as Block[]);
          if (data?.title) setTitle(data.title);
        });
    } else {
      setTitle("Untitled Note");
      setBlocks([{ id: genId(), type: "paragraph", content: "" }]);
      setNoteId(null);
    }
  }, [open, initialNote, user]);

  // ─── Realtime presence + broadcast ───────────────────────────────────────
  useEffect(() => {
    if (!open || !noteId) return;

    const channel = supabase
      .channel(`live_note_${noteId}`)
      .on("broadcast", { event: "blocks_update" }, ({ payload }) => {
        if (payload.sender !== user?.id) {
          setBlocks(payload.blocks);
          setTitle(payload.title);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const usernames = Object.values(state).flat().map((p: any) => p.username).filter(Boolean);
        setActiveUsers(usernames);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ username: user?.email?.split("@")[0] || "Student", user_id: user?.id });
        }
      });

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [open, noteId, user]);

  // ─── Broadcast changes to other users ────────────────────────────────────
  const broadcast = useCallback((newBlocks: Block[], newTitle: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "blocks_update",
      payload: { blocks: newBlocks, title: newTitle, sender: user?.id },
    });
  }, [user]);

  // ─── Save to database (debounced) ─────────────────────────────────────────
  const persistNote = useCallback(async (newBlocks: Block[], newTitle: string, id: string | null) => {
    if (!user) return;
    setSaving(true);
    try {
      if (id) {
        await supabase.from("live_notes").update({ content: newBlocks, title: newTitle, updated_at: new Date().toISOString() }).eq("id", id);
      } else {
        const { data } = await supabase.from("live_notes").insert({ title: newTitle, content: newBlocks, created_by: user.id }).select("id").single();
        if (data?.id) setNoteId(data.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const debouncedSave = useCallback((newBlocks: Block[], newTitle: string, id: string | null) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => persistNote(newBlocks, newTitle, id), 1500);
  }, [persistNote]);

  // ─── Block manipulation ───────────────────────────────────────────────────
  const updateBlock = (id: string, content: string) => {
    // Detect slash command
    if (content.startsWith("/") && !content.includes("\n")) {
      setSlashMenu({ blockId: id, query: content.slice(1) });
      setSlashIndex(0);
    } else {
      setSlashMenu(null);
    }

    const newBlocks = blocks.map(b => b.id === id ? { ...b, content } : b);
    setBlocks(newBlocks);
    broadcast(newBlocks, title);
    debouncedSave(newBlocks, title, noteId);
  };

  const convertBlock = (id: string, type: BlockType) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, type, content: "" } : b);
    setBlocks(newBlocks);
    setSlashMenu(null);
    broadcast(newBlocks, title);
    debouncedSave(newBlocks, title, noteId);
    setTimeout(() => inputRefs.current[id]?.focus(), 30);
  };

  const addBlock = (afterId: string, type: BlockType = "paragraph") => {
    const idx = blocks.findIndex(b => b.id === afterId);
    const newBlock: Block = { id: genId(), type, content: "" };
    const newBlocks = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
    setBlocks(newBlocks);
    broadcast(newBlocks, title);
    debouncedSave(newBlocks, title, noteId);
    setTimeout(() => inputRefs.current[newBlock.id]?.focus(), 30);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) return;
    const idx = blocks.findIndex(b => b.id === id);
    const newBlocks = blocks.filter(b => b.id !== id);
    setBlocks(newBlocks);
    broadcast(newBlocks, title);
    debouncedSave(newBlocks, title, noteId);
    const prevId = blocks[Math.max(0, idx - 1)].id;
    setTimeout(() => inputRefs.current[prevId]?.focus(), 30);
  };

  const handleKeyDown = (blockId: string) => (e: React.KeyboardEvent<HTMLElement>) => {
    if (slashMenu) {
      const filtered = SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slashMenu.query.toLowerCase()));
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex(i => (i + 1) % filtered.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex(i => (i - 1 + filtered.length) % filtered.length); return; }
      if (e.key === "Enter") { e.preventDefault(); if (filtered[slashIndex]) convertBlock(blockId, filtered[slashIndex].type); return; }
      if (e.key === "Escape") { setSlashMenu(null); return; }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBlock(blockId);
    }
    if (e.key === "Backspace") {
      const block = blocks.find(b => b.id === blockId);
      if (block?.content === "") {
        e.preventDefault();
        removeBlock(blockId);
      }
    }
  };

  const filteredSlashCommands = slashMenu
    ? SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slashMenu.query.toLowerCase()))
    : [];

  const updateTitle = (newTitle: string) => {
    setTitle(newTitle);
    broadcast(blocks, newTitle);
    debouncedSave(blocks, newTitle, noteId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-background/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
            ) : saved ? (
              <><Check className="h-3 w-3 text-success" /> Saved</>
            ) : (
              <span>Live Note</span>
            )}
            {activeUsers.length > 1 && (
              <div className="flex items-center gap-1 ml-2">
                <Users className="h-3 w-3" />
                <span>{activeUsers.length} online</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => persistNote(blocks, title, noteId)}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          <div className="max-w-2xl mx-auto px-8 py-10">
            {/* Title */}
            <input
              value={title}
              onChange={e => updateTitle(e.target.value)}
              placeholder="Untitled Note"
              className="w-full text-4xl font-black tracking-tight bg-transparent outline-none focus:ring-0 border-none mb-8 placeholder:text-muted-foreground/30"
              autoFocus={!initialNote?.id}
            />

            {/* Blocks */}
            <div className="space-y-1 relative">
              {blocks.map((block, i) => (
                <div key={block.id} className="relative group/block" onFocus={() => setFocusedBlockId(block.id)}>
                  <BlockEditor
                    block={block}
                    onUpdate={content => updateBlock(block.id, content)}
                    onKeyDown={handleKeyDown(block.id)}
                    autoFocus={i === 0 && !!initialNote?.id === false && i === blocks.length - 1}
                    inputRef={el => { inputRefs.current[block.id] = el; }}
                  />

                  {/* Slash command palette */}
                  {slashMenu?.blockId === block.id && filteredSlashCommands.length > 0 && (
                    <div className="absolute left-0 z-50 mt-1 w-64 rounded-xl border border-border/60 bg-popover shadow-xl overflow-hidden">
                      {filteredSlashCommands.map((cmd, idx) => (
                        <button
                          key={cmd.type}
                          onMouseDown={e => { e.preventDefault(); convertBlock(block.id, cmd.type); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${idx === slashIndex ? "bg-primary/10" : "hover:bg-muted/50"}`}
                        >
                          <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <cmd.icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{cmd.label}</p>
                            <p className="text-xs text-muted-foreground">{cmd.description}</p>
                          </div>
                          {idx === slashIndex && <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <p className="text-xs text-muted-foreground/40 mt-12 text-center">
              Type <kbd className="px-1 py-0.5 rounded border border-border/40 font-mono">/</kbd> for commands · Enter for new block · Backspace on empty block to delete
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
