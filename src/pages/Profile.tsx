import { useState, useEffect } from "react";
import {
  Award, BookOpen, Users, MessageSquare, Edit2, Check, X,
  LogOut, Loader2, Shield, Coins, UploadCloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMeetups } from "@/contexts/MeetupContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

type Profile = {
  display_name: string;
  email: string;
  status: string;
  credits: number;
  bio?: string;
  year?: string;
  program?: string;
};

const BADGES = [
  { name: "STEM Gold Medalist", emoji: "🏅", earned: true },
  { name: "Top Contributor", emoji: "⭐", earned: true },
  { name: "Study Group Leader", emoji: "👑", earned: true },
  { name: "100 Uploads", emoji: "📤", earned: false },
  { name: "Forum Helper", emoji: "🤝", earned: true },
  { name: "Mentor", emoji: "🎓", earned: false },
];

const STATUS_OPTIONS = ["🟢 Online", "🔴 Focusing", "☕ Taking a break", "📚 Studying", "🌙 Away"];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { tutoringAvailable, setTutoringAvailable, credits } = useApp();
  const { meetups } = useMeetups();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable field states
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [year, setYear] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");

  // Real stats derived from data
  const joinedMeetups = meetups.filter((m) => m.joined).length;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const fallback: Profile = {
        display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Student",
        email: user.email || "",
        status: "🟢 Online",
        credits: 1250,
        bio: "",
        year: "Year 1",
        program: "BSc Computer Science",
      };

      const p = data ? { ...fallback, ...data } : fallback;
      setProfile(p);
      setDisplayName(p.display_name);
      setBio(p.bio || "");
      setYear(p.year || "Year 1");
      setProgram(p.program || "BSc Computer Science");
      setStatus(p.status || "🟢 Online");
      setLoading(false);
    };
    load();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const updates = { display_name: displayName, bio, year, program, status };
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...updates });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setProfile((p) => p ? { ...p, ...updates } : p);
      setEditing(false);
      toast({ title: "Profile saved ✓" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out" });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <div className="glass-card p-6">
          <div className="flex items-start gap-5">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="glass-card p-5"><Skeleton className="h-32 w-full" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">👤 Profile</h1>
        <div className="flex items-center gap-2">
          {!editing ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Edit2 className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" className="gap-1.5" onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">
              {getInitials(displayName || "?")}
            </span>
          </div>

          <div className="flex-1 space-y-2">
            {editing ? (
              <div className="space-y-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="text-lg font-bold h-9"
                />
                <div className="flex gap-2">
                  <Input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. BSc Computer Science" className="text-sm" />
                  <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. Year 2" className="text-sm w-28" />
                </div>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio — tell others what you study and what you can help with..." rows={2} className="text-sm" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{profile?.display_name}</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile?.program || "BSc Computer Science"} · {profile?.year || "Year 1"} · Faculty of Informatics, ELTE
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                {profile?.bio && <p className="text-sm">{profile.bio}</p>}
              </>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-warning" /> {credits} credits</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {joinedMeetups} meetups joined</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> {user?.email?.split("@")[1] || "ELTE"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Picker */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-semibold text-sm">Current Status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={async () => {
                setStatus(s);
                if (user) {
                  await supabase.from("profiles").upsert({ id: user.id, status: s });
                  toast({ title: `Status set to ${s}` });
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                status === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/50 text-muted-foreground hover:border-primary/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tutoring Toggle */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            🎓 Available for Tutoring
            {tutoringAvailable && <Badge className="text-[10px] h-4 bg-success text-white border-0">Active</Badge>}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Let other students know you can help with their courses
          </p>
        </div>
        <Switch checked={tutoringAvailable} onCheckedChange={setTutoringAvailable} />
      </div>

      {/* Account Info */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Account
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-muted-foreground">Account ID</span>
            <span className="font-mono text-xs text-muted-foreground">{user?.id?.slice(0, 8)}…</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Member since</span>
            <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "—"}</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="glass-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-primary" /> Achievements
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {BADGES.map((b) => (
            <div key={b.name} className={`glass-subtle p-3 text-center rounded-lg transition-all ${!b.earned ? "opacity-40 grayscale" : "hover:scale-105"}`}>
              <span className="text-2xl">{b.emoji}</span>
              <p className="text-xs font-medium mt-1">{b.name}</p>
              {!b.earned && <p className="text-[10px] text-muted-foreground">Locked</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
