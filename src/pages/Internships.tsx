import { useState, useEffect } from "react";
import {
  Briefcase, MapPin, Clock, ExternalLink, Search,
  Plus, Loader2, Building2, Globe, Laptop, Bookmark, BookmarkCheck, Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type Internship = {
  id: number;
  company: string;
  role: string;
  location: string;
  type: "Remote" | "Hybrid" | "On-site";
  deadline: string;
  tags: string[];
  description: string;
  apply_url: string;
  posted_by: string;
  poster_id: string;
  verified: boolean;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES = ["Remote", "Hybrid", "On-site"] as const;
const TECH_TAGS = ["Python", "Java", "React", "TypeScript", "JavaScript", "Kotlin", "C++", "SQL", "ML", "Spring", "Node.js", "Go", "Rust", "CSS", "Microservices", "AWS", "Docker"];

const typeIcon = (t: string) => {
  if (t === "Remote") return <Globe className="h-3 w-3" />;
  if (t === "Hybrid") return <Laptop className="h-3 w-3" />;
  return <Building2 className="h-3 w-3" />;
};

const typeColor = (t: string) => {
  if (t === "Remote") return "bg-success/10 text-success border-success/20";
  if (t === "Hybrid") return "bg-warning/10 text-warning border-warning/20";
  return "bg-primary/10 text-primary border-primary/20";
};

function getLogoInitials(company: string) {
  return company.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  if (d < 0) return "Expired";
  if (d === 0) return "Due today!";
  if (d <= 3) return `⚠️ ${d}d left`;
  return `${d}d left`;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const seedJobs: Omit<Internship, "id" | "created_at">[] = [
  { company: "Morgan Stanley", role: "Software Engineering Intern", location: "Budapest", type: "Hybrid", deadline: "2026-04-15", tags: ["Java", "Spring"], description: "Join our Budapest tech hub. Work on trading platforms with experienced engineers.", apply_url: "https://careers.morganstanley.com", posted_by: "Admin", poster_id: "", verified: true },
  { company: "EPAM Systems", role: "Junior Developer Program", location: "Budapest", type: "On-site", deadline: "2026-04-30", tags: ["React", "TypeScript"], description: "12-week intensive program with mentorship. Full-time offer possible for top performers.", apply_url: "https://careers.epam.com", posted_by: "Admin", poster_id: "", verified: true },
  { company: "Prezi", role: "Frontend Engineering Intern", location: "Budapest", type: "Remote", deadline: "2026-04-01", tags: ["React", "CSS"], description: "Work on the presentation platform used by millions worldwide. Great team culture.", apply_url: "https://prezi.com/jobs", posted_by: "Admin", poster_id: "", verified: true },
  { company: "Ericsson", role: "Research Intern – AI/ML", location: "Budapest", type: "Hybrid", deadline: "2026-05-01", tags: ["Python", "ML"], description: "Research position in 5G network optimization using machine learning methods.", apply_url: "https://jobs.ericsson.com", posted_by: "Admin", poster_id: "", verified: true },
  { company: "Wise", role: "Backend Engineering Intern", location: "Budapest", type: "Hybrid", deadline: "2026-04-20", tags: ["Kotlin", "Microservices"], description: "Build fast, reliable financial infrastructure for millions of customers globally.", apply_url: "https://wise.com/jobs", posted_by: "Admin", poster_id: "", verified: true },
  { company: "OTP Bank", role: "Data Engineering Intern", location: "Budapest", type: "On-site", deadline: "2026-03-31", tags: ["SQL", "Python"], description: "Work with large-scale financial data pipelines and analytics systems.", apply_url: "https://otpbank.hu/careers", posted_by: "Admin", poster_id: "", verified: true },
];

// ─── Post Internship Dialog ───────────────────────────────────────────────────
function PostDialog({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: (j: Internship) => void }) {
  const { user } = useAuth();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("Budapest");
  const [type, setType] = useState<"Remote" | "Hybrid" | "On-site">("Hybrid");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  const toggleTag = (tag: string) =>
    setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  const submit = async () => {
    if (!company.trim() || !role.trim() || !deadline) {
      toast({ title: "Fill company, role, and deadline", variant: "destructive" });
      return;
    }
    setPosting(true);
    const postedBy = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anonymous";
    const { data, error } = await supabase.from("internships").insert({
      company: company.trim(), role: role.trim(), location: location.trim() || "Budapest",
      type, deadline, tags: selectedTags, description: description.trim(),
      apply_url: applyUrl.trim(), posted_by: postedBy, poster_id: user?.id, verified: false,
    }).select().single();
    setPosting(false);
    if (error) { toast({ title: "Failed to post", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Internship posted! 🎉", description: "It's now visible to all ELTE students." });
    onPosted(data as Internship);
    setCompany(""); setRole(""); setDeadline(""); setDescription(""); setApplyUrl(""); setSelectedTags([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Post an Internship
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Company *</label>
              <Input placeholder="e.g. Google Budapest" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Input placeholder="e.g. Budapest" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role / Position *</label>
            <Input placeholder="e.g. Software Engineering Intern" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Work Type</label>
              <div className="flex gap-1">
                {TYPES.map((t) => (
                  <button key={t} onClick={() => setType(t)}
                    className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Application Deadline *</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tech Stack / Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TECH_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-all ${selectedTags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea placeholder="What will the intern do? What skills are needed?" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Apply URL</label>
            <Input placeholder="https://company.com/careers" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} />
          </div>

          <Button className="w-full gap-2" onClick={submit} disabled={posting}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {posting ? "Posting..." : "Post Internship"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, saved, onToggleSave }: { job: Internship; saved: boolean; onToggleSave: () => void }) {
  const deadline = daysUntil(job.deadline);
  const expired = deadline === "Expired";

  return (
    <div className={`glass-card p-5 flex items-start gap-4 hover:shadow-md transition-all duration-200 group ${expired ? "opacity-60" : ""}`}>
      {/* Logo */}
      <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-primary">{getLogoInitials(job.company)}</span>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{job.role}</h3>
            {job.verified && <Badge className="text-[10px] h-4 bg-success/10 text-success border-success/20 border px-1">✓ Verified</Badge>}
          </div>
          <p className="text-xs text-muted-foreground font-medium">{job.company}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
          <Badge variant="outline" className={`text-[10px] flex items-center gap-1 ${typeColor(job.type)}`}>
            {typeIcon(job.type)} {job.type}
          </Badge>
          <span className={`flex items-center gap-1 ${deadline.includes("⚠️") ? "text-warning font-medium" : expired ? "text-destructive" : ""}`}>
            <Clock className="h-3 w-3" />{deadline}
          </span>
        </div>

        {job.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {job.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
          <span className="text-[10px] text-muted-foreground ml-auto">Posted by {job.posted_by} · {timeAgo(job.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button onClick={onToggleSave} className="p-1 hover:text-primary transition-colors">
          {saved
            ? <BookmarkCheck className="h-4 w-4 text-primary" />
            : <Bookmark className="h-4 w-4 text-muted-foreground" />}
        </button>
        <Button
          size="sm"
          className="h-7 gap-1 text-xs"
          disabled={expired || !job.apply_url}
          onClick={() => job.apply_url && window.open(job.apply_url, "_blank")}
        >
          Apply <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Internships() {
  const [jobs, setJobs] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [postOpen, setPostOpen] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const loadJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("internships")
      .select("*")
      .order("verified", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      setJobs(data as Internship[]);
    } else {
      // Auto-seed starter listings
      const { data: seeded } = await supabase.from("internships").insert(seedJobs).select();
      if (seeded) setJobs(seeded as Internship[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadJobs(); }, []);

  const toggleSave = (id: number) => setSaved((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // All unique tags across jobs
  const allTags = [...new Set(jobs.flatMap((j) => j.tags))].sort();

  const filtered = jobs.filter((j) => {
    if (search && !j.company.toLowerCase().includes(search.toLowerCase()) && !j.role.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && j.type !== typeFilter) return false;
    if (tagFilter !== "all" && !j.tags.includes(tagFilter)) return false;
    return true;
  });

  const savedJobs = filtered.filter((j) => saved.has(j.id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">💼 Internship Board</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading..." : `${jobs.length} opportunities`} for ELTE CS students — post yours too!
          </p>
        </div>
        <Button className="gap-2" onClick={() => setPostOpen(true)}>
          <Plus className="h-4 w-4" /> Post Internship
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search company or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {["all", "Remote", "Hybrid", "On-site"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tech Stack" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tech</SelectItem>
            {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Results info */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {jobs.length} listings
          {(typeFilter !== "all" || tagFilter !== "all" || search) && (
            <button onClick={() => { setSearch(""); setTypeFilter("all"); setTagFilter("all"); }} className="ml-2 text-primary hover:underline">Clear</button>
          )}
        </p>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedJobs.length})</TabsTrigger>
          <TabsTrigger value="remote">Remote ({filtered.filter((j) => j.type === "Remote").length})</TabsTrigger>
        </TabsList>

        {[
          ["all", filtered],
          ["saved", savedJobs],
          ["remote", filtered.filter((j) => j.type === "Remote")],
        ].map(([tab, items]) => (
          <TabsContent key={tab as string} value={tab as string} className="mt-4 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-5 flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-64" /></div>
                </div>
              ))
            ) : (items as Internship[]).length === 0 ? (
              <div className="glass-subtle rounded-xl p-12 text-center space-y-3">
                <p className="text-4xl">💼</p>
                <p className="font-medium">{tab === "saved" ? "No saved listings" : "No listings found"}</p>
                <p className="text-sm text-muted-foreground">{tab === "saved" ? "Bookmark a job to save it" : "Try adjusting your filters"}</p>
                {tab !== "saved" && (
                  <Button size="sm" className="gap-2 mt-2" onClick={() => setPostOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Post an Internship
                  </Button>
                )}
              </div>
            ) : (
              (items as Internship[]).map((job) => (
                <JobCard key={job.id} job={job} saved={saved.has(job.id)} onToggleSave={() => toggleSave(job.id)} />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <PostDialog open={postOpen} onClose={() => setPostOpen(false)} onPosted={(j) => setJobs((p) => [j, ...p])} />
    </div>
  );
}
