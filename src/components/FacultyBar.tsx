import { useApp } from "@/contexts/AppContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const communities = [
  { id: "informatics", emoji: "💻", label: "Informatics" },
  { id: "mathematics", emoji: "📐", label: "Mathematics" },
  { id: "personal", emoji: "🏠", label: "Personal Workspace" },
];

export function FacultyBar() {
  const { activeCommunity, setActiveCommunity } = useApp();

  return (
    <div className="w-[68px] shrink-0 flex flex-col items-center gap-2 py-4 bg-muted/60 border-r border-border/40">
      {communities.map((c) => (
        <Tooltip key={c.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActiveCommunity(c.id)}
              className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-200 hover:rounded-xl ${
                activeCommunity === c.id
                  ? "bg-primary text-primary-foreground rounded-xl shadow-md"
                  : "bg-background hover:bg-accent/20"
              }`}
            >
              {c.emoji}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{c.label}</TooltipContent>
        </Tooltip>
      ))}
      <div className="w-8 h-px bg-border my-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl bg-background hover:bg-accent/20 hover:rounded-xl transition-all duration-200 text-muted-foreground">
            +
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Join Community</TooltipContent>
      </Tooltip>
    </div>
  );
}
