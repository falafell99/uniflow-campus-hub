import { useState } from "react";
import { Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const PANEL_OPTIONS = [
  { value: "notes", label: "📝 Notes" },
  { value: "vault", label: "📚 Vault" },
  { value: "oracle", label: "🧠 AI Oracle" },
  { value: "tasks", label: "✅ Tasks" },
  { value: "calendar", label: "📅 Calendar" },
  { value: "flashcards", label: "🃏 Flashcards" },
];

const panelRoutes: Record<string, string> = {
  notes: "/notes",
  vault: "/vault",
  oracle: "/ai-oracle",
  tasks: "/tasks",
  calendar: "/calendar",
  flashcards: "/flashcards",
};

export function SplitScreen() {
  const [open, setOpen] = useState(false);
  const [leftPanel, setLeftPanel] = useState("notes");
  const [rightPanel, setRightPanel] = useState("oracle");

  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen(true)} title="Split Screen">
        <Columns2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 [&>button]:hidden">
          <div className="flex h-full">
            {/* Left panel */}
            <div className="flex-1 flex flex-col border-r border-border/20">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-card/50">
                <span className="text-xs text-muted-foreground font-medium">Left Panel</span>
                <select value={leftPanel} onChange={e => setLeftPanel(e.target.value)}
                  className="ml-auto text-xs bg-background border border-border/30 rounded-md px-2 py-1 outline-none">
                  {PANEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe src={panelRoutes[leftPanel]} className="w-full h-full border-0" title={leftPanel} />
              </div>
            </div>

            {/* Resize handle */}
            <div className="w-1 bg-border/20 hover:bg-primary/30 cursor-col-resize transition-colors shrink-0" />

            {/* Right panel */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-card/50">
                <span className="text-xs text-muted-foreground font-medium">Right Panel</span>
                <select value={rightPanel} onChange={e => setRightPanel(e.target.value)}
                  className="ml-auto text-xs bg-background border border-border/30 rounded-md px-2 py-1 outline-none">
                  {PANEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe src={panelRoutes[rightPanel]} className="w-full h-full border-0" title={rightPanel} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
