import { useState, useEffect } from "react";
import { Clock, FileText, Users, Star as StarIcon } from "lucide-react";
import { useMeetups } from "@/contexts/MeetupContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { FavoritesSection } from "./FavoritesSection";
import { MeetupsSection } from "./MeetupsSection";
import { TrendingSection } from "./TrendingSection";
import { SubjectsSection } from "./SubjectsSection";
import { StatsSection } from "./StatsSection";

type VaultResource = {
  id: string;
  title: string;
  author: string;
  downloads: number;
  tag: string;
  tagClass: string;
};

const quickSubjects = [
  { id: 1, name: "Linear Algebra", code: "GEIAL145", progress: 72, color: "bg-primary" },
  { id: 2, name: "Algorithms & Data Structures", code: "GEIAL219", progress: 58, color: "bg-success" },
  { id: 3, name: "Discrete Mathematics", code: "GEIAL112", progress: 85, color: "bg-warning" },
];

// Static fallback resources shown if vault_files table is empty
const fallbackResources: VaultResource[] = [
  { id: "res-1", title: "Calculus II Final Cheat Sheet", author: "Anna K.", downloads: 234, tag: "Exam Prep", tagClass: "badge-exam" },
  { id: "res-2", title: "Data Structures Lecture Notes", author: "Márton B.", downloads: 189, tag: "Student Notes", tagClass: "badge-golden" },
  { id: "res-3", title: "Probability Theory Slides — Week 10", author: "Prof. Szabó", downloads: 156, tag: "Lecture Slides", tagClass: "badge-slides" },
  { id: "res-4", title: "Operating Systems Past Papers 2024", author: "Dániel T.", downloads: 142, tag: "Exam Prep", tagClass: "badge-exam" },
];

function tagClassForType(fileType: string): string {
  if (fileType === "Exam Prep") return "badge-exam";
  if (fileType === "Lecture Slides") return "badge-slides";
  return "badge-golden";
}

function getFirstName(fullName?: string) {
  if (!fullName) return "Student";
  return fullName.split(" ")[0];
}

export default function Dashboard() {
  const { meetups } = useMeetups();
  const { favorites, toggleFavorite } = useApp();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trendingResources, setTrendingResources] = useState<VaultResource[]>(fallbackResources);

  // Derive first name from Supabase auth metadata
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Student";
  const firstName = getFirstName(displayName);

  // Load latest uploads from vault_files as "trending"
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("vault_files")
        .select("id, name, uploader, downloads, file_type")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!error && data && data.length > 0) {
        setTrendingResources(
          data.map((f) => ({
            id: String(f.id),
            title: f.name,
            author: f.uploader,
            downloads: f.downloads || 0,
            tag: f.file_type || "Student Notes",
            tagClass: tagClassForType(f.file_type),
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  const favoriteResources = trendingResources.filter((r) => favorites.includes(r.id));

  const weekStats = [
    { label: "Resources Available", value: String(trendingResources.length), icon: FileText },
    { label: "Meetups Joined", value: String(meetups.filter((m) => m.joined).length), icon: Users },
    { label: "Total Meetups", value: String(meetups.length), icon: StarIcon },
    { label: "Study Hours", value: "18h", icon: Clock },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening at ELTE Informatics today.</p>
      </div>

      <FavoritesSection resources={favoriteResources} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MeetupsSection meetups={meetups} loading={loading} />
          <TrendingSection
            resources={trendingResources}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            loading={loading}
          />
        </div>
        <div className="space-y-6">
          <SubjectsSection subjects={quickSubjects} loading={loading} />
          <StatsSection stats={weekStats} />
        </div>
      </div>
    </div>
  );
}
