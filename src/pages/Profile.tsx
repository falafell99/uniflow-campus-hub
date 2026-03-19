import { useState, useEffect } from "react";
import {
  Award, Users, Edit2, Check, X,
  LogOut, Loader2, Shield, Coins, Smile
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

// ─── Types ────────────────────────────────────────────────────────────────────
type Profile = {
  display_name: string;
  email: string;
  status: string;
  credits: number;
  bio?: string;
  avatar_color?: string;
  avatar_emoji?: string;
  university?: string;
  faculty?: string;
  year_of_study?: string;
  major?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const BADGES = [
  { name: "STEM Gold Medalist", emoji: "🏅", earned: true },
  { name: "Top Contributor", emoji: "⭐", earned: true },
  { name: "Study Group Leader", emoji: "👑", earned: true },
  { name: "100 Uploads", emoji: "📤", earned: false },
  { name: "Forum Helper", emoji: "🤝", earned: true },
  { name: "Mentor", emoji: "🎓", earned: false },
];

const STATUS_OPTIONS = ["🟢 Online", "🔴 Focusing", "☕ Taking a break", "📚 Studying", "🌙 Away"];

export const AVATAR_COLORS = [
  { from: "#6366f1", to: "#8b5cf6", label: "Violet" },
  { from: "#10b981", to: "#059669", label: "Emerald" },
  { from: "#f59e0b", to: "#d97706", label: "Amber" },
  { from: "#ef4444", to: "#dc2626", label: "Red" },
  { from: "#ec4899", to: "#db2777", label: "Pink" },
  { from: "#3b82f6", to: "#2563eb", label: "Blue" },
  { from: "#14b8a6", to: "#0d9488", label: "Teal" },
  { from: "#f97316", to: "#ea580c", label: "Orange" },
];

const AVATAR_EMOJIS = [
  "🦁", "🐻", "🦊", "🐺", "🦝", "🐼", "🐨", "🦄",
  "🐸", "🦋", "🐙", "🦑", "🦔", "🐬", "🦅", "🦉",
  "🚀", "⚡", "🔥", "💎", "🌙", "🌟", "🎯", "🎮",
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Reusable Avatar Component ────────────────────────────────────────────────
export function AvatarDisplay({
  name,
  avatarColor,
  avatarEmoji,
  size = "lg",
}: {
  name: string;
  avatarColor?: string;
  avatarEmoji?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = { sm: "h-8 w-8 text-sm rounded-xl", md: "h-10 w-10 text-base rounded-xl", lg: "h-20 w-20 text-2xl rounded-2xl" };
  const colorEntry = AVATAR_COLORS.find((c) => c.from === avatarColor) ?? AVATAR_COLORS[0];
  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center shrink-0 font-bold text-white`}
      style={{ background: `linear-gradient(135deg, ${colorEntry.from}, ${colorEntry.to})` }}
    >
      {avatarEmoji || getInitials(name || "?")}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Profile() {
  const { user, signOut } = useAuth();
  const { tutoringAvailable, setTutoringAvailable, credits } = useApp();
  const { meetups } = useMeetups();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [major, setMajor] = useState("");
  const [status, setStatus] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0].from);
  const [avatarEmoji, setAvatarEmoji] = useState("");

  const joinedMeetups = meetups.filter((m) => m.joined).length;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const fallback: Profile = {
        display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Student",
        email: user.email || "",
        status: "🟢 Online",
        credits: 1250,
        bio: "",
        university: "UniFlow University",
        faculty: "Faculty of Science",
        year_of_study: "Year 1",
        major: "Computer Science",
        avatar_color: AVATAR_COLORS[0].from,
        avatar_emoji: "",
      };
      const p = data ? { ...fallback, ...data } : fallback;
      setProfile(p);
      setDisplayName(p.display_name);
      setBio(p.bio || "");
      setUniversity(p.university || "UniFlow University");
      setFaculty(p.faculty || "Faculty of Science");
      setYearOfStudy(p.year_of_study || "Year 1");
      setMajor(p.major || "Computer Science");
      setStatus(p.status || "🟢 Online");
      setAvatarColor(p.avatar_color || AVATAR_COLORS[0].from);
      setAvatarEmoji(p.avatar_emoji || "");
      setLoading(false);
    };
    load();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const updates = { 
      display_name: displayName, 
      bio, 
      university,
      faculty,
      year_of_study: yearOfStudy,
      major,
      status, 
      avatar_color: avatarColor, 
      avatar_emoji: avatarEmoji 
    };
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...updates });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setProfile((p) => (p ? { ...p, ...updates } : p));
      setEditing(false);
      setShowAvatarPicker(false);
      toast({ title: "Profile saved ✓" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <div className="glass-card p-6">
          <div className="flex items-start gap-5">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <div className="flex-1 space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-64" /><Skeleton className="h-4 w-32" /></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">👤 Profile</h1>
        <div className="flex items-center gap-2">
          {!editing ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Edit2 className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setEditing(false); setShowAvatarPicker(false); }}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" className="gap-1.5" onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={async () => { await signOut(); toast({ title: "Signed out" }); }}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative">
            <AvatarDisplay name={displayName} avatarColor={avatarColor} avatarEmoji={avatarEmoji} size="lg" />
            {editing && (
              <button
                onClick={() => setShowAvatarPicker((v) => !v)}
                className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2">
            {editing ? (
              <div className="space-y-2">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="text-lg font-bold h-9" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University" className="text-sm" title="University" />
                  <Input value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Faculty" className="text-sm" title="Faculty" />
                  <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Major" className="text-sm" title="Major" />
                  <Input value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} placeholder="Year of Study" className="text-sm" title="Year of Study" />
                </div>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio..." rows={2} className="text-sm" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{profile?.display_name}</h2>
                  <span className="text-xs text-muted-foreground">{status}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile?.major || "Computer Science"} · {profile?.year_of_study || "Year 1"}
                </p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-primary">
                  {profile?.university || "UniFlow University"} · {profile?.faculty || "Science"}
                </p>
                <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                {profile?.bio && <p className="text-sm mt-2">{profile.bio}</p>}
              </>
            )}
            <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-warning" /> {credits} credits</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {joinedMeetups} meetups</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Student</span>
            </div>
          </div>
        </div>

        {/* Avatar Picker */}
        {showAvatarPicker && (
          <div className="mt-5 pt-5 border-t border-border/30 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Avatar Color</p>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.from}
                    onClick={() => { setAvatarColor(c.from); setAvatarEmoji(""); }}
                    title={c.label}
                    className={`h-8 w-8 rounded-full transition-all hover:scale-110 ${avatarColor === c.from && !avatarEmoji ? "ring-2 ring-offset-2 ring-white/60" : ""}`}
                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Or pick an emoji avatar</p>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setAvatarEmoji("")}
                  className={`h-9 w-9 rounded-lg text-xs border transition-all flex items-center justify-center ${!avatarEmoji ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50"}`}
                >
                  ABC
                </button>
                {AVATAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setAvatarEmoji(emoji)}
                    className={`h-9 w-9 rounded-lg text-lg border transition-all hover:scale-110 ${avatarEmoji === emoji ? "border-primary bg-primary/10 scale-110" : "border-border/50 hover:border-primary/50"}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="flex items-center gap-3 p-3 glass-subtle rounded-xl">
              <AvatarDisplay name={displayName} avatarColor={avatarColor} avatarEmoji={avatarEmoji} size="md" />
              <div>
                <p className="text-sm font-medium">{displayName || "Your Name"}</p>
                <p className="text-xs text-muted-foreground">{avatarEmoji ? "Emoji avatar" : "Initials avatar"}</p>
              </div>
            </div>
          </div>
        )}
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
                if (user) { await supabase.from("profiles").upsert({ id: user.id, status: s }); toast({ title: `Status → ${s}` }); }
              }}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
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
          <p className="text-xs text-muted-foreground mt-0.5">Let other students know you can help</p>
        </div>
        <Switch checked={tutoringAvailable} onCheckedChange={setTutoringAvailable} />
      </div>

      {/* Account */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Account</h3>
        <div className="space-y-0 text-sm divide-y divide-border/30">
          <div className="flex items-center justify-between py-2"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div>
          <div className="flex items-center justify-between py-2"><span className="text-muted-foreground">Account ID</span><span className="font-mono text-xs text-muted-foreground">{user?.id?.slice(0, 8)}…</span></div>
          <div className="flex items-center justify-between py-2"><span className="text-muted-foreground">Member since</span><span>{user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "—"}</span></div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4">🔔 Notifications</h3>
        <div className="flex items-center justify-between p-3 bg-card border border-border/40 rounded-xl">
          <div>
            <p className="text-sm font-medium">Deadline reminders</p>
            <p className="text-xs text-muted-foreground">Get notified 7 days, 3 days, 1 day, and 3 hours before deadlines</p>
          </div>
          <Button size="sm" variant="outline" onClick={async () => {
            if (typeof Notification === "undefined") { toast({ title: "Not supported", description: "This browser doesn't support notifications" }); return; }
            const permission = await Notification.requestPermission();
            if (permission === "granted") toast({ title: "✓ Enabled", description: "Notifications enabled!" });
            else toast({ title: "Blocked", description: "Please allow notifications in your browser settings", variant: "destructive" });
          }}>
            {typeof Notification !== "undefined" && Notification.permission === "granted" ? "✓ Enabled" : "Enable"}
          </Button>
        </div>
      </div>

      {/* Achievements */}
      <div className="glass-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Award className="h-5 w-5 text-primary" /> Achievements</h3>
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
