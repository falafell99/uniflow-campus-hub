import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** "card" applies .glass-card (heavier blur, stronger border), "subtle" applies .glass-subtle */
  variant?: "card" | "subtle";
  padding?: string;
}

/**
 * GlassCard — reusable glass-morphism container.
 * Wraps the .glass-card / .glass-subtle patterns from index.css.
 */
export function GlassCard({
  children,
  className,
  variant = "card",
  padding = "p-5",
}: GlassCardProps) {
  return (
    <div
      className={cn(
        variant === "card" ? "glass-card" : "glass-subtle",
        padding,
        className
      )}
    >
      {children}
    </div>
  );
}
