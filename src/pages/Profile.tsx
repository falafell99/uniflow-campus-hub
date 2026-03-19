import { useState, useEffect } from "react";
import {
  Award, Users, Edit2, Check, X,
  LogOut, Loader2, Shield, Coins, Smile,
  FileText, NotebookPen, CheckSquare
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

export const AVATAR_COLORS = ["#7b68ee", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];

const AVATAR_EMOJIS = ["🎓", "📚", "🧠", "💻", "⚡", "🔥", "🌟", "🎯", "🚀", "🦊", "🐺", "🦁", "🐉", "👾", "🤖"];

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
  const bg = avatarColor || "#7b68ee";
  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center shrink-0 font-bold text-white`}
      style={{ background: bg }}
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
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState("");

  const [fileCount, setFileCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);

  const joinedMeetups = meetups.filter((m) => m.joined).length;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      
      const [{ count: fCount }, { count: nCount }, { count: tCount }] = await Promise.all([
        supabase.from("files").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("student_notes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setFileCount(fCount || 0);
      setNoteCount(nCount || 0);
      setTaskCount(tCount || 0);

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
        avatar_color: AVATAR_COLORS[0],
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
      setAvatarColor(p.avatar_color || AVATAR_COLORS[0]);
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
      <div className="glass-card overflow-hidden">
        <div className="relative">
          {/* Cover/banner */}
          <div className="h-32 bg-gradient-to-br from-[#7b68ee]/30 via-[#7b68ee]/10 to-transparent rounded-t-2xl" />
          
          {/* Avatar overlapping the banner */}
          <div className="absolute -bottom-6 left-6">
            <div
              className="h-20 w-20 rounded-2xl border-4 border-background flex items-center justify-center text-3xl font-black text-white shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: avatarColor || "#7b68ee" }}
              onClick={() => setShowAvatarPicker((v) => !v)}
            >
              {avatarEmoji || displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          </div>
        </div>

        <div className="mt-10 px-6 pb-6">
          {editing ? (
            <div className="space-y-3 mt-4">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="text-lg font-bold h-9 bg-background" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University" className="text-sm bg-background" title="University" />
                <Input value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Faculty" className="text-sm bg-background" title="Faculty" />
                <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Major" className="text-sm bg-background" title="Major" />
                <Input value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} placeholder="Year of Study" className="text-sm bg-background" title="Year of Study" />
              </div>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio..." rows={2} className="text-sm bg-background" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black">{displayName}</h1>
              <p className="text-muted-foreground text-sm mt-1">{profile?.university || "Add your university"} · {profile?.faculty || "Add faculty"}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" />{fileCount} files</span>
                <span className="flex items-center gap-1.5"><NotebookPen className="h-4 w-4" />{noteCount} notes</span>
                <span className="flex items-center gap-1.5"><CheckSquare className="h-4 w-4" />{taskCount} tasks</span>
              </div>
              {profile?.bio && <p className="text-sm mt-4">{profile.bio}</p>}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/40 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-warning" /> {credits} credits</span>
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {joinedMeetups} meetups</span>
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Student</span>
              </div>
            </>
          )}
        </div>

        {/* Avatar Picker */}
        {showAvatarPicker && (
          <div className="px-6 pb-6 pt-2">
            <h3 className="font-semibold text-sm mb-3">Choose Avatar</h3>
            <div className="grid grid-cols-5 gap-2 p-4 bg-background border border-border/40 rounded-2xl">
              {AVATAR_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => setAvatarEmoji(emoji)}
                  className={`h-10 w-10 rounded-xl text-xl flex items-center justify-center hover:bg-primary/10 transition-colors ${avatarEmoji === emoji ? "bg-primary/20 ring-1 ring-primary" : ""}`}>
                  {emoji}
                </button>
              ))}
              <div className="col-span-5 mt-2 flex gap-2 flex-wrap">
                {AVATAR_COLORS.map(color => (
                  <button key={color} onClick={() => setAvatarColor(color)}
                    className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${avatarColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-background" : ""}`}
                    style={{ background: color }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="py-2"><hr className="border-border/40"/></div>
      <h2 className="text-xl font-bold tracking-tight">Settings</h2>

      {/* Status & Options */}
      <div className="grid md:grid-cols-2 gap-6">
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
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Account */}
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center justify-between">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Account details</div>
            <button className="text-xs text-primary hover:underline" onClick={() => toast({title: "Check email for reset link"})}>Reset Password</button>
          </h3>
          <div className="space-y-0 text-sm divide-y divide-border/30">
            <div className="flex items-center justify-between py-2"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div>
            <div className="flex items-center justify-between py-2"><span className="text-muted-foreground">Account ID</span><span className="font-mono text-xs text-muted-foreground">{user?.id?.slice(0, 8)}…</span></div>
            <div className="flex items-center justify-between py-2"><span className="text-muted-foreground">Member since</span><span>{user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "—"}</span></div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">🔔 Notifications</h3>
          <div className="flex items-center justify-between p-3 bg-background border border-border/40 rounded-xl">
            <div>
              <p className="text-sm font-medium">Deadline reminders</p>
              <p className="text-xs text-muted-foreground mt-0.5">Alerts before task deadlines</p>
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
