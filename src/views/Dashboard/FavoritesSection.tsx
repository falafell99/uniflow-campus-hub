import { FileText, Star as StarIcon } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { ResourceBadge } from "@/components/ResourceBadge";

interface Resource {
  id: string;
  title: string;
  tag: string;
  tagClass: string;
}

interface FavoritesSectionProps {
  resources: Resource[];
}

export function FavoritesSection({ resources }: FavoritesSectionProps) {
  if (resources.length === 0) return null;

  return (
    <GlassCard>
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
        <StarIcon className="h-5 w-5 text-warning fill-warning" /> Favorites
      </h2>
      <div className="space-y-2">
        {resources.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium flex-1">{r.title}</span>
            <ResourceBadge tag={r.tag} tagClass={r.tagClass} />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
