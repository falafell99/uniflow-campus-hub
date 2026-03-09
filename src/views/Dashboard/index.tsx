import { useState, useEffect } from "react";
import { Clock, FileText, Users } from "lucide-react";
import { Star as StarIcon } from "lucide-react";
import { useMeetups } from "@/contexts/MeetupContext";
import { useApp } from "@/contexts/AppContext";
import { FavoritesSection } from "./FavoritesSection";
import { MeetupsSection } from "./MeetupsSection";
import { TrendingSection } from "./TrendingSection";
import { SubjectsSection } from "./SubjectsSection";
import { StatsSection } from "./StatsSection";

const trendingResources = [
  { id: "res-1", title: "Calculus II Final Cheat Sheet", author: "Anna K.", downloads: 234, tag: "Exam Prep", tagClass: "badge-exam" },
  { id: "res-2", title: "Data Structures Lecture Notes (Golden)", author: "Márton B.", downloads: 189, tag: "Student Notes", tagClass: "badge-golden" },
  { id: "res-3", title: "Probability Theory Slides - Week 10", author: "Prof. Szabó", downloads: 156, tag: "Lecture Slides", tagClass: "badge-slides" },
  { id: "res-4", title: "Operating Systems Past Papers 2024", author: "Dániel T.", downloads: 142, tag: "Exam Prep", tagClass: "badge-exam" },
];

const quickSubjects = [
  { id: 1, name: "Linear Algebra", code: "GEIAL145", progress: 72, color: "bg-primary" },
  { id: 2, name: "Algorithms & Data Structures", code: "GEIAL219", progress: 58, color: "bg-success" },
  { id: 3, name: "Discrete Mathematics", code: "GEIAL112", progress: 85, color: "bg-warning" },
];

export default function Dashboard() {
  const { meetups } = useMeetups();
  const { favorites, toggleFavorite } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const favoriteResources = trendingResources.filter((r) => favorites.includes(r.id));

  const weekStats = [
    { label: "Resources Viewed", value: "24", icon: FileText },
    { label: "Meetups Joined", value: String(meetups.filter((m) => m.joined).length), icon: Users },
    { label: "Forum Posts", value: "7", icon: StarIcon },
    { label: "Study Hours", value: "18h", icon: Clock },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, Ahmed 👋</h1>
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
