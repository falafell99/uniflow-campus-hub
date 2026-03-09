import { ComponentType } from "react";
import { LucideProps } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatCard } from "@/components/StatCard";

interface Stat {
  label: string;
  value: string;
  icon: ComponentType<LucideProps>;
}

interface StatsSectionProps {
  stats: Stat[];
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <GlassCard>
      <h2 className="text-lg font-semibold mb-4">This Week</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} Icon={s.icon} />
        ))}
      </div>
    </GlassCard>
  );
}
