import { TrendingUp, FileText, Star as StarIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/GlassCard";
import { SectionHeader } from "@/components/SectionHeader";
import { ResourceBadge } from "@/components/ResourceBadge";
import { useNavigate } from "react-router-dom";

interface Resource {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  downloads: number;
  tag: string;
  tagClass: string;
}

interface TrendingSectionProps {
  resources: Resource[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onAuthorClick?: (id: string) => void;
  loading: boolean;
}

export function TrendingSection({
  resources,
  favorites,
  onToggleFavorite,
  onAuthorClick,
  loading,
}: TrendingSectionProps) {
  const navigate = useNavigate();

  return (
    <GlassCard>
      <SectionHeader
        title="Trending in Informatics"
        Icon={TrendingUp}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs"
            onClick={() => navigate("/vault")}
          >
            Browse Vault <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        }
      />
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))
          : resources.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium truncate">{r.title}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    by{" "}
                    {r.authorId ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAuthorClick) onAuthorClick(r.authorId!);
                        }}
                        className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {r.author}
                      </button>
                    ) : (
                      <span className="font-medium text-foreground">{r.author}</span>
                    )}
                    {" · "}{r.downloads} downloads
                  </p>
                </div>
                <button
                  onClick={() => onToggleFavorite(r.id)}
                  className="shrink-0 p-1 hover:scale-110 transition-transform"
                >
                  <StarIcon
                    className={`h-4 w-4 ${
                      favorites.includes(r.id)
                        ? "fill-warning text-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
                <ResourceBadge tag={r.tag} tagClass={r.tagClass} />
              </div>
            ))}
      </div>
    </GlassCard>
  );
}
