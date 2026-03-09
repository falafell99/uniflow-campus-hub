import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResourceBadgeProps {
  tag: string;
  tagClass: string;
  className?: string;
}

/**
 * ResourceBadge — renders a styled Badge using badge-golden / badge-exam / badge-slides
 * CSS classes defined in index.css, sourced from theme constants.
 * Centralises the repeated `<Badge variant="outline" className={...}>` pattern.
 */
export function ResourceBadge({ tag, tagClass, className }: ResourceBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] shrink-0", tagClass, className)}
    >
      {tag}
    </Badge>
  );
}
