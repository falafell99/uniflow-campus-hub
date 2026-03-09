import { useState } from "react";
import { Briefcase, MapPin, Clock, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const internships = [
  { id: 1, company: "Morgan Stanley", role: "Software Engineering Intern", location: "Budapest", type: "Hybrid", deadline: "Mar 30, 2026", tags: ["Java", "Spring"], logo: "MS" },
  { id: 2, company: "EPAM Systems", role: "Junior Developer Program", location: "Budapest", type: "On-site", deadline: "Apr 15, 2026", tags: ["React", "TypeScript"], logo: "EP" },
  { id: 3, company: "Prezi", role: "Frontend Engineering Intern", location: "Budapest", type: "Remote", deadline: "Apr 1, 2026", tags: ["React", "CSS"], logo: "PZ" },
  { id: 4, company: "Ericsson", role: "Research Intern – AI/ML", location: "Budapest", type: "Hybrid", deadline: "May 1, 2026", tags: ["Python", "ML"], logo: "ER" },
  { id: 5, company: "OTP Bank", role: "Data Engineering Intern", location: "Budapest", type: "On-site", deadline: "Mar 25, 2026", tags: ["SQL", "Python"], logo: "OT" },
  { id: 6, company: "Wise", role: "Backend Engineering Intern", location: "Budapest", type: "Hybrid", deadline: "Apr 20, 2026", tags: ["Kotlin", "Microservices"], logo: "WS" },
];

export default function Internships() {
  const [search, setSearch] = useState("");

  const filtered = internships.filter((i) =>
    !search || i.company.toLowerCase().includes(search.toLowerCase()) || i.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">💼 Internship Board</h1>
        <p className="text-muted-foreground mt-1">Curated internship opportunities for ELTE CS students in Budapest.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search companies or roles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-3">
        {filtered.map((job) => (
          <div key={job.id} className="glass-card p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200 group">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{job.logo}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{job.role}</h3>
              <p className="text-xs text-muted-foreground">{job.company}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.type}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {job.deadline}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {job.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
              ))}
              <Button size="sm" className="h-7 gap-1 text-xs ml-2">
                Apply <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
