import { useState, useEffect, useCallback } from "react";
import {
  Briefcase, MapPin, Clock, ExternalLink, Search,
  Plus, Loader2, Building2, Globe, Laptop, Bookmark,
  BookmarkCheck, ChevronRight, CheckCircle2, Circle,
  Euro, Calendar, X, BadgeCheck, Sparkles
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
  requirements?: string;
  apply_url: string;
  posted_by: string;
  poster_id: string;
  verified: boolean;
  created_at: string;
  salary_min?: number;
  salary_max?: number;
  duration?: string;
  applicants?: number;
};

type ApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES = ["Remote", "Hybrid", "On-site"] as const;
const TECH_TAGS = ["Python", "Java", "React", "TypeScript", "JavaScript", "Kotlin", "C++", "SQL", "ML", "Spring", "Node.js", "Go", "Rust", "CSS", "Microservices", "AWS", "Docker", "Figma", "Swift", "R"];

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  saved:     { label: "Saved",    color: "text-muted-foreground", icon: <Bookmark className="h-3.5 w-3.5" /> },
  applied:   { label: "Applied",  color: "text-primary",          icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  interview: { label: "Interview",color: "text-warning",           icon: <Calendar className="h-3.5 w-3.5" /> },
  offer:     { label: "Offer! 🎉",color: "text-success",           icon: <BadgeCheck className="h-3.5 w-3.5" /> },
  rejected:  { label: "Rejected", color: "text-destructive",       icon: <X className="h-3.5 w-3.5" /> },
};

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
  if (d === 0) return "today"; if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`; return `${Math.floor(d / 7)}w ago`;
}
function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  if (d < 0) return "Expired"; if (d === 0) return "Due today!";
  if (d <= 3) return `⚠️ ${d}d left`; return `${d}d left`;
}
function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  if (min && max) return `€${min}–€${max}/mo`;
  if (min) return `from €${min}/mo`;
  return `up to €${max}/mo`;
}

// ─── Company logos (gradient colors by logo initials) ─────────────────────────
const LOGO_COLORS: Record<string, string> = {
  MS: "from-blue-600 to-blue-800", EP: "from-orange-500 to-orange-700",
  PR: "from-purple-500 to-purple-700", ER: "from-blue-400 to-cyan-600",
  WI: "from-green-500 to-green-700", OT: "from-blue-700 to-indigo-800",
  GO: "from-red-500 to-red-700", IT: "from-yellow-500 to-orange-600",
  DB: "from-red-600 to-rose-800", AM: "from-orange-400 to-orange-600",
};
function logoGradient(company: string) {
  const init = getLogoInitials(company);
  return LOGO_COLORS[init] ?? "from-primary/60 to-primary";
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const seedJobs: Omit<Internship, "id" | "created_at">[] = [
  {
    company: "Morgan Stanley", role: "Software Engineering Intern", location: "Budapest", type: "Hybrid",
    deadline: "2026-04-15", tags: ["Java", "Spring", "Microservices"],
    description: "Join our Budapest technology hub and work alongside experienced engineers on mission-critical trading and risk management platforms used globally. You'll contribute to real production systems from day one.",
    requirements: "• 2nd or 3rd year CS student\n• Strong Java fundamentals\n• Interest in financial technology\n• Good English communication",
    apply_url: "https://careers.morganstanley.com", posted_by: "Admin", poster_id: "", verified: true,
    salary_min: 1200, salary_max: 1500, duration: "3–6 months", applicants: 47,
  },
  {
    company: "EPAM Systems", role: "Junior Developer Program", location: "Budapest", type: "On-site",
    deadline: "2026-04-30", tags: ["React", "TypeScript", "Node.js"],
    description: "12-week intensive developer program combining training with real project work. Top performers receive full-time offers. EPAM operates in 55+ countries and this program is a proven path to a career in tech.",
    requirements: "• 1st–3rd year CS or Engineering student\n• Basic web development knowledge\n• Motivated and a fast learner\n• Available full-time during program",
    apply_url: "https://careers.epam.com", posted_by: "Admin", poster_id: "", verified: true,
    salary_min: 900, salary_max: 1100, duration: "12 weeks", applicants: 83,
  },
  {
    company: "Prezi", role: "Frontend Engineering Intern", location: "Budapest", type: "Remote",
    deadline: "2026-04-01", tags: ["React", "TypeScript", "CSS"],
    description: "Work on the presentation platform used by 100M+ users worldwide. You'll build new features in a modern React codebase, collaborate with a top-tier design team, and ship real improvements to production.",
    requirements: "• Solid React & TypeScript skills\n• Eye for design and UX\n• Experience with CSS/Tailwind\n• Side projects or portfolio preferred",
    apply_url: "https://prezi.com/jobs", posted_by: "Admin", poster_id: "", verified: true,
    salary_min: 1000, salary_max: 1300, duration: "3–6 months", applicants: 29,
  },
  {
    company: "Ericsson", role: "Research Intern – AI/ML", location: "Budapest", type: "Hybrid",
    deadline: "2026-05-01", tags: ["Python", "ML", "SQL"],
    description: "Research position in 5G network optimization using machine learning. Work with PhDs and senior researchers on cutting-edge problems. Publications possible for outstanding work.",
    requirements: "• Studying AI, ML, or CS with strong ML focus\n• Proficient in Python, PyTorch or TensorFlow\n• Statistics and linear algebra background\n• Prior research experience is a plus",
    apply_url: "https://jobs.ericsson.com", posted_by: "Admin", poster_id: "", verified: true,
    salary_min: 1100, salary_max: 1400, duration: "4–6 months", applicants: 21,
  },
  {
    company: "Wise", role: "Backend Engineering Intern", location: "Budapest", type: "Hybrid",
    deadline: "2026-04-20", tags: ["Kotlin", "Microservices", "AWS"],
    description: "Build fast, reliable financial infrastructure that helps millions of people move money across borders. You'll work on real backend services in Kotlin, contributing to systems processing billions in transactions.",
    requirements: "• Strong OOP fundamentals (Java or Kotlin preferred)\n• Understanding of RESTful APIs\n• Interest in fintech and distributed systems\n• 3rd year or Master student",
    apply_url: "https://wise.com/jobs", posted_by: "Admin", poster_id: "", verified: true,
    salary_min: 1300, salary_max: 1700, duration: "3 months", applicants: 38,
  },
  {
    company: "OTP Bank", role: "Data Engineering Intern", location: "Budapest", type: "On-site",
    deadline: "2026-03-31", tags: ["SQL", "Python", "Docker"],
    description: "Work with Hungary's largest bank on large-scale data pipelines and analytics systems. You'll build and maintain ETL processes that power business-critical reporting used by thousands of employees.",
    requirements: "• Strong SQL skills\n• Python experience (pandas, sqlalchemy)\n• Interest in data engineering and finance\n• Hungarian language preferred",
    apply_url: "https://otpbank.hu/careers", posted_by: "Admin", poster_id: "", verified: true,
    salary_min: 800, salary_max: 1000, duration: "3–4 months", applicants: 14,
  },
  {
    company: "Itron", role: "Embedded Systems Intern", location: "Miskolc / Remote", type: "Hybrid",
    deadline: "2026-05-15", tags: ["C++", "Python", "AWS"],
    description: "Work on IoT devices and energy metering systems deployed across Europe. You'll help develop firmware and cloud integration for smart grid technology.",
    requirements: "• C or C++ experience\n• Electronics or CS background\n• Interest in embedded / IoT systems",
    apply_url: "https://itron.com/careers", posted_by: "Admin", poster_id: "", verified: true,
    salary_min: 900, salary_max: 1100, duration: "3–6 months", applicants: 8,
  },
  {
    company: "Deutsche Telekom IT", role: "Full Stack Developer Intern", location: "Budapest", type: "Hybrid",
    deadline: "2026-04-25", tags: ["React", "Java", "SQL", "Docker"],
    description: "Join the IT innovation center for Deutsche Telekom. Build internal tools and customer-facing apps that reach millions of users across Europe.",
    requirements: "• React or Vue.js experience\n• Java Spring or Node.js backend skills\n• Team player with good communication\n• Available at least 20h/week",
    apply_url: "https://telekom.hu/karriere", posted_by: "Admin", poster_id: "", verified: true,
    salary_min: 1000, salary_max: 1200, duration: "6 months", applicants: 31,
  },
  {
    company: "Amlyze", role: "ML / Data Science Intern", location: "Remote (EU)", type: "Remote",
    deadline: "2026-05-30", tags: ["Python", "ML", "R", "SQL"],
    description: "Anti-money laundering fintech. Work on transaction monitoring models, anomaly detection, and risk scoring algorithms for European banks.",
    requirements: "• ML coursework or projects\n• Python (scikit-learn, pandas)\n• Statistics background",
    apply_url: "https://amlyze.com/careers", posted_by: "Admin", poster_id: "", verified: false,
    salary_min: 800, salary_max: 1000, duration: "3 months", applicants: 5,
  },
  {
    company: "Gravity R&D", role: "Recommender Systems Intern", location: "Budapest", type: "Hybrid",
    deadline: "2026-06-01", tags: ["Python", "ML", "Go"],
    description: "Build recommendation engines that serve millions of users across e-commerce platforms. Work directly with the core ML team on production ranking models.",
    requirements: "• Strong Python and ML fundamentals\n• Linear algebra and probability\n• Portfolio projects or Kaggle experience",
    apply_url: "https://www.gravityrd.com/careers", posted_by: "Admin", poster_id: "", verified: true,
    salary_min: 1100, salary_max: 1300, duration: "3–6 months", applicants: 12,
  },
];

// ─── Post Dialog ──────────────────────────────────────────────────────────────
function PostDialog({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: (j: Internship) => void }) {
  const { user } = useAuth();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("Budapest");
  const [type, setType] = useState<"Remote" | "Hybrid" | "On-site">("Hybrid");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [duration, setDuration] = useState("");
  const [posting, setPosting] = useState(false);

  const toggleTag = (tag: string) =>
    setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  const submit = async () => {
    if (!company.trim() || !role.trim() || !deadline) {
      toast({ title: "Fill company, role, and deadline", variant: "destructive" }); return;
    }
    setPosting(true);
    const postedBy = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anonymous";
    const { data, error } = await supabase.from("internships").insert({
      company: company.trim(), role: role.trim(), location: location.trim() || "Budapest",
      type, deadline, tags: selectedTags, description: description.trim(),
      requirements: requirements.trim(),
      apply_url: applyUrl.trim(), posted_by: postedBy, poster_id: user?.id, verified: false,
      salary_min: salaryMin ? parseInt(salaryMin) : null,
      salary_max: salaryMax ? parseInt(salaryMax) : null,
      duration: duration.trim() || null,
      applicants: 0,
    }).select().single();
    setPosting(false);
    if (error) { toast({ title: "Failed to post", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Internship posted! 🎉" });
    onPosted(data as Internship);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Post an Internship</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Company *</label><Input placeholder="e.g. Google Budapest" value={company} onChange={(e) => setCompany(e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Location</label><Input placeholder="Budapest" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Role / Position *</label><Input placeholder="Software Engineering Intern" value={role} onChange={(e) => setRole(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Work Type</label>
              <div className="flex gap-1">{TYPES.map((t) => (<button key={t} onClick={() => setType(t)} className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>{t}</button>))}</div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Deadline *</label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Min salary (€/mo)</label><Input type="number" placeholder="800" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Max salary (€/mo)</label><Input type="number" placeholder="1200" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Duration</label><Input placeholder="3 months" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Tech Stack</label>
            <div className="flex flex-wrap gap-1.5">{TECH_TAGS.map((tag) => (<button key={tag} onClick={() => toggleTag(tag)} className={`px-2 py-0.5 rounded-full text-xs border transition-all ${selectedTags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>{tag}</button>))}</div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Description</label><Textarea placeholder="What will the intern work on?" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Requirements (one per line)</label><Textarea placeholder="• 2nd year CS student&#10;• React experience" rows={3} value={requirements} onChange={(e) => setRequirements(e.target.value)} /></div>
          <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Apply URL</label><Input placeholder="https://company.com/careers" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} /></div>
          <Button className="w-full gap-2" onClick={submit} disabled={posting}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {posting ? "Posting..." : "Post Internship"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Job Detail Modal ─────────────────────────────────────────────────────────
function JobDetailModal({ job, onClose, status, onStatusChange }: {
  job: Internship | null;
  onClose: () => void;
  status?: ApplicationStatus;
  onStatusChange: (s: ApplicationStatus | undefined) => void;
}) {
  if (!job) return null;
  const deadline = daysUntil(job.deadline);
  const salary = formatSalary(job.salary_min, job.salary_max);

  return (
    <Dialog open={!!job} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${logoGradient(job.company)} flex items-center justify-center shrink-0`}>
              <span className="text-lg font-bold text-white">{getLogoInitials(job.company)}</span>
            </div>
            <div>
              <DialogTitle className="text-lg">{job.role}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{job.company}</span>
                {job.verified && <Badge className="text-[10px] h-4 bg-success/10 text-success border-success/20 border px-1">✓ Verified</Badge>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Key info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <MapPin className="h-3.5 w-3.5" />, val: job.location },
              { icon: typeIcon(job.type), val: job.type },
              { icon: <Clock className="h-3.5 w-3.5" />, val: deadline, highlight: deadline.includes("⚠️") },
              salary ? { icon: <Euro className="h-3.5 w-3.5" />, val: salary } : null,
              job.duration ? { icon: <Calendar className="h-3.5 w-3.5" />, val: job.duration } : null,
            ].filter(Boolean).map((item, i) => (
              <div key={i} className={`glass-subtle rounded-lg p-2.5 flex items-center gap-2 text-xs ${item!.highlight ? "text-warning" : "text-muted-foreground"}`}>
                {item!.icon}<span>{item!.val}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {job.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold mb-2">About the Role</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>
          </div>

          {/* Requirements */}
          {job.requirements && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Requirements</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                {job.requirements.split("\n").map((req, i) => (
                  <p key={i}>{req}</p>
                ))}
              </div>
            </div>
          )}

          {/* Application tracker */}
          <div className="border-t border-border/30 pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Track your application</p>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.entries(STATUS_CONFIG) as [ApplicationStatus, typeof STATUS_CONFIG[ApplicationStatus]][]).map(([s, cfg]) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(status === s ? undefined : s)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                    status === s ? "bg-primary/10 border-primary text-primary" : "border-border/40 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {cfg.icon}{cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" disabled={!job.apply_url} onClick={() => job.apply_url && window.open(job.apply_url, "_blank")}>
              Apply Now <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>

          {job.applicants && job.applicants > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              🎓 {job.applicants} students have viewed this via UniFlow
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, status, onStatusChange, onClick }: {
  job: Internship;
  status?: ApplicationStatus;
  onStatusChange: (s: ApplicationStatus | undefined) => void;
  onClick: () => void;
}) {
  const deadline = daysUntil(job.deadline);
  const expired = deadline === "Expired";
  const salary = formatSalary(job.salary_min, job.salary_max);

  return (
    <div
      className={`glass-card p-5 flex items-start gap-4 hover:shadow-md transition-all duration-200 cursor-pointer group ${expired ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${logoGradient(job.company)} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
        <span className="text-sm font-bold text-white">{getLogoInitials(job.company)}</span>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{job.role}</h3>
            {job.verified && <BadgeCheck className="h-3.5 w-3.5 text-success shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground font-medium">{job.company}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
          <Badge variant="outline" className={`text-[10px] flex items-center gap-1 ${typeColor(job.type)}`}>
            {typeIcon(job.type)} {job.type}
          </Badge>
          {salary && <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{salary}</span>}
          <span className={`flex items-center gap-1 ${deadline.includes("⚠️") ? "text-warning font-medium" : expired ? "text-destructive" : ""}`}>
            <Clock className="h-3 w-3" />{deadline}
          </span>
        </div>

        {job.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {job.tags.slice(0, 4).map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
          {job.tags.length > 4 && <span className="text-[10px] text-muted-foreground">+{job.tags.length - 4}</span>}
          <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(job.created_at)}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Status indicator */}
        {status ? (
          <button
            onClick={() => onStatusChange(undefined)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${STATUS_CONFIG[status].color} border-current/30`}
          >
            {STATUS_CONFIG[status].icon}
            {STATUS_CONFIG[status].label}
          </button>
        ) : (
          <button
            onClick={() => onStatusChange("saved")}
            className="p-1 hover:text-primary transition-colors text-muted-foreground"
            title="Save"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Internships() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [postOpen, setPostOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<Internship | null>(null);
  // Application statuses: stored in localStorage keyed by job id
  const [statuses, setStatuses] = useState<Record<number, ApplicationStatus>>(() => {
    try { return JSON.parse(localStorage.getItem("uniflow-internship-status") ?? "{}"); }
    catch { return {}; }
  });

  const saveStatus = (id: number, s: ApplicationStatus | undefined) => {
    setStatuses((prev) => {
      const next = { ...prev };
      if (s) next[id] = s; else delete next[id];
      localStorage.setItem("uniflow-internship-status", JSON.stringify(next));
      return next;
    });
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("internships").select("*")
      .order("verified", { ascending: false }).order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      setJobs(data as Internship[]);
    } else {
      const { data: seeded } = await supabase.from("internships").insert(seedJobs).select();
      if (seeded) setJobs(seeded as Internship[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const allTags = [...new Set(jobs.flatMap((j) => j.tags))].sort();

  const filtered = jobs.filter((j) => {
    if (search && !j.company.toLowerCase().includes(search.toLowerCase()) && !j.role.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && j.type !== typeFilter) return false;
    if (tagFilter !== "all" && !j.tags.includes(tagFilter)) return false;
    return true;
  });

  const trackedJobs = filtered.filter((j) => !!statuses[j.id]);
  const savedJobs = filtered.filter((j) => statuses[j.id] === "saved");
  const remoteJobs = filtered.filter((j) => j.type === "Remote");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">💼 Internship Board</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {loading ? "Loading…" : `${jobs.length} opportunities for ELTE CS students`}
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
          <Input placeholder="Search company or role…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {["all", "Remote", "Hybrid", "On-site"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tech Stack" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tech</SelectItem>
            {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {jobs.length} listings
          {(typeFilter !== "all" || tagFilter !== "all" || search) && (
            <button onClick={() => { setSearch(""); setTypeFilter("all"); setTagFilter("all"); }} className="ml-2 text-primary hover:underline">Clear filters</button>
          )}
        </p>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="remote">Remote ({remoteJobs.length})</TabsTrigger>
          <TabsTrigger value="tracked">
            <Sparkles className="h-3 w-3 mr-1" />Tracking ({trackedJobs.length})
          </TabsTrigger>
        </TabsList>

        {([
          ["all", filtered],
          ["remote", remoteJobs],
          ["tracked", trackedJobs],
        ] as [string, Internship[]][]).map(([tab, items]) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-5 flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-64" /></div>
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="glass-subtle rounded-xl p-12 text-center space-y-3">
                <p className="text-4xl">{tab === "tracked" ? "📋" : "💼"}</p>
                <p className="font-medium">{tab === "tracked" ? "No tracked applications" : "No listings found"}</p>
                <p className="text-sm text-muted-foreground">
                  {tab === "tracked" ? "Click a job card and set your status to track applications" : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              items.map((job) => (
                <JobCard
                  key={job.id} job={job}
                  status={statuses[job.id]}
                  onStatusChange={(s) => saveStatus(job.id, s)}
                  onClick={() => setDetailJob(job)}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <PostDialog open={postOpen} onClose={() => setPostOpen(false)} onPosted={(j) => setJobs((p) => [j, ...p])} />
      <JobDetailModal
        job={detailJob} onClose={() => setDetailJob(null)}
        status={detailJob ? statuses[detailJob.id] : undefined}
        onStatusChange={(s) => { if (detailJob) saveStatus(detailJob.id, s); }}
      />
    </div>
  );
}
