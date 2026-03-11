import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarDisplay } from "@/pages/Profile";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, MessageSquare, Award, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface PublicProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

type PublicProfile = {
  display_name: string;
  status: string;
  bio?: string;
  year?: string;
  program?: string;
  avatar_color?: string;
  avatar_emoji?: string;
};

export function PublicProfileModal({ userId, onClose }: PublicProfileModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ uploads: 0, forumPosts: 0 });

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      // Fetch profile
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, status, bio, year, program, avatar_color, avatar_emoji")
        .eq("id", userId)
        .single();
      
      if (!error && data) {
        setProfile(data as PublicProfile);
      } else {
        // Fallback if profile doesn't exist
        setProfile({ display_name: "Student", status: "Offline" });
      }

      // Fetch stats
      const [vaultRes, forumRes] = await Promise.all([
        supabase.from("vault_files").select("id", { count: "exact", head: true }).eq("uploader_id", userId),
        supabase.from("forum_threads").select("id", { count: "exact", head: true }).eq("author_id", userId)
      ]);

      setStats({
        uploads: vaultRes.count ?? 0,
        forumPosts: forumRes.count ?? 0
      });

      setLoading(false);
    };

    loadProfile();
  }, [userId]);

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border/40 font-sans">
        {/* Header Cover */}
        <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent relative">
          <div className="absolute -bottom-10 left-6">
            {loading ? (
              <Skeleton className="h-24 w-24 rounded-2xl" />
            ) : (
              <AvatarDisplay
                name={profile?.display_name || "Student"}
                avatarColor={profile?.avatar_color}
                avatarEmoji={profile?.avatar_emoji}
                size="lg"
              />
            )}
          </div>
        </div>

        <div className="pt-12 pb-6 px-6">
          {loading ? (
            <div className="space-y-4">
              <div>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{profile.display_name}</h2>
                  <div className="flex items-center gap-2">
                    {user && userId !== user.id && (
                      <Button size="sm" variant="outline" className="h-6 text-xs gap-1.5 px-2.5 rounded-full" onClick={() => {
                        onClose();
                        navigate(`/messages?user=${userId}`);
                      }}>
                        <MessageSquare className="h-3 w-3" /> Message
                      </Button>
                    )}
                    <Badge variant={profile.status.includes("Online") ? "default" : "secondary"} className="bg-background border-border/40">
                      {profile.status || "Offline"}
                    </Badge>
                  </div>
                </div>
                {(profile.year || profile.program) && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    {profile.year && (
                      <span className="font-semibold text-foreground/80 bg-muted/60 px-2 py-0.5 rounded-md">
                        {profile.year.includes("Year") ? profile.year : `${profile.year} Year`}
                      </span>
                    )}
                    {profile.program && <span>{profile.program}</span>}
                  </p>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm bg-muted/40 p-3 rounded-xl border border-border/30">
                  "{profile.bio}"
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col justify-center gap-1 p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-card/60 transition-colors">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Vault Uploads</span>
                  </div>
                  <p className="text-3xl font-black tracking-tighter leading-none">{stats.uploads}</p>
                </div>
                <div className="flex flex-col justify-center gap-1 p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-card/60 transition-colors">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Discussions</span>
                  </div>
                  <p className="text-3xl font-black tracking-tighter leading-none">{stats.forumPosts}</p>
                </div>
              </div>

              {/* Achievements placeholder */}
              <div className="pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground mb-3 tracking-widest uppercase">Achievements</p>
                <div className="flex gap-2.5 flex-wrap">
                  {stats.uploads > 10 && (
                    <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-xs bg-warning/10 text-warning hover:bg-warning/20 border-warning/20">
                      <Award className="h-3.5 w-3.5" /> Vault Contributor
                    </Badge>
                  )}
                  {stats.forumPosts > 5 && (
                    <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-xs bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                      <MessageSquare className="h-3.5 w-3.5" /> Active Helper
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-xs bg-success/10 text-success hover:bg-success/20 border-success/20">
                    <Clock className="h-3.5 w-3.5" /> Early Adopter
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center">Profile not found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
