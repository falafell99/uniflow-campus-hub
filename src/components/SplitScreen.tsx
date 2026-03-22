import { useState } from "react";
import { Columns2, X } from "lucide-react";
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
  const [activeMobileTab, setActiveMobileTab] = useState<"left" | "right">("left");

  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen(true)} title="Split Screen">
        <Columns2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 [&>button]:hidden flex flex-col">
          
          {/* Mobile Tabs Header */}
          <div className="md:hidden flex items-center p-2 gap-2 bg-card/80 backdrop-blur border-b border-border/20 shrink-0">
            <Button
              variant={activeMobileTab === "left" ? "default" : "outline"}
              onClick={() => setActiveMobileTab("left")}
              className="flex-1 h-9 text-xs font-semibold"
            >
              {PANEL_OPTIONS.find(o => o.value === leftPanel)?.label}
            </Button>
            <Button
              variant={activeMobileTab === "right" ? "default" : "outline"}
              onClick={() => setActiveMobileTab("right")}
              className="flex-1 h-9 text-xs font-semibold"
            >
              {PANEL_OPTIONS.find(o => o.value === rightPanel)?.label}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 ml-1 border hover:bg-destructive/10 hover:border-destructive/30" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Left panel */}
            <div className={`flex-1 flex-col md:border-r border-border/20 ${activeMobileTab === "left" ? "flex" : "hidden md:flex"}`}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-card/50">
                <span className="text-xs text-muted-foreground font-medium hidden md:inline shrink-0">Left Panel</span>
                <select value={leftPanel} onChange={e => setLeftPanel(e.target.value)}
                  className="text-xs bg-background border border-border/30 rounded-md px-2 py-1 outline-none w-full md:w-auto h-8">
                  {PANEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <div className="hidden md:flex flex-1" />
              </div>
              <div className="flex-1 overflow-hidden relative">
                <iframe src={panelRoutes[leftPanel]} className="absolute inset-0 w-full h-full border-0" title={leftPanel} />
              </div>
            </div>

            {/* Resize handle */}
            <div className="hidden md:block w-1 bg-border/20 hover:bg-primary/30 cursor-col-resize transition-colors shrink-0" />

            {/* Right panel */}
            <div className={`flex-1 flex-col ${activeMobileTab === "right" ? "flex" : "hidden md:flex"}`}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-card/50">
                <span className="text-xs text-muted-foreground font-medium hidden md:inline shrink-0">Right Panel</span>
                <select value={rightPanel} onChange={e => setRightPanel(e.target.value)}
                  className="text-xs bg-background border border-border/30 rounded-md px-2 py-1 outline-none w-full md:w-auto h-8">
                  {PANEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <div className="hidden md:flex flex-1" />
                <Button variant="ghost" size="icon" className="h-6 w-6 hidden md:flex" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <iframe src={panelRoutes[rightPanel]} className="absolute inset-0 w-full h-full border-0" title={rightPanel} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
