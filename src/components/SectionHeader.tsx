import { cn } from "@/lib/utils";
import { ReactNode, ComponentType } from "react";
import { LucideProps } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  /** Optional lucide icon to render before the title */
  Icon?: ComponentType<LucideProps>;
  /** Optional JSX rendered to the right (e.g. a "View all" button) */
  action?: ReactNode;
  className?: string;
  iconClassName?: string;
}

/**
 * SectionHeader — consistent h2 title row used throughout the app.
 * Accepts an icon, title text, and an optional right-side action slot.
 */
export function SectionHeader({
  title,
  Icon,
  action,
  className,
  iconClassName,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        {Icon && (
          <Icon className={cn("h-5 w-5 text-primary", iconClassName)} />
        )}
        {title}
      </h2>
      {action && <div>{action}</div>}
    </div>
  );
}
