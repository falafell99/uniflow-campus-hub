import { BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/GlassCard";
import { SectionHeader } from "@/components/SectionHeader";

interface Subject {
  id: number;
  name: string;
  code: string;
  progress: number;
  color: string;
}

interface SubjectsSectionProps {
  subjects: Subject[];
  loading: boolean;
}

export function SubjectsSection({ subjects, loading }: SubjectsSectionProps) {
  return (
    <GlassCard>
      <SectionHeader title="My Subjects" Icon={BookOpen} />
      <div className="space-y-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-subtle p-3.5 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))
          : subjects.map((s) => (
              <div
                key={s.id}
                className="glass-subtle p-3.5 cursor-pointer hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">{s.name}</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">{s.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={s.progress} className="flex-1 h-1.5" />
                  <span className="text-xs font-medium text-muted-foreground">{s.progress}%</span>
                </div>
              </div>
            ))}
      </div>
    </GlassCard>
  );
}
