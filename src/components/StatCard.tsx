import { ComponentType } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  Icon: ComponentType<LucideProps>;
  className?: string;
}

/**
 * StatCard — compact metric tile used in the "This Week" grid on Dashboard.
 * Renders a centered icon, bold value, and descriptive label.
 */
export function StatCard({ label, value, Icon, className }: StatCardProps) {
  return (
    <div className={cn("glass-subtle p-3 text-center", className)}>
      <Icon className="h-4 w-4 mx-auto text-primary mb-1" />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
