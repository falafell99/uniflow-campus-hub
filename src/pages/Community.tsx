import { useState, useEffect, useRef } from "react";
import { Rss, MessageSquare, UserSearch, CalendarDays, Mic, X, GraduationCap, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

// ─── Tab Types ────────────────────────────────────────────────────────────────
type TabId = "feed" | "discuss" | "people" | "meetups" | "voice" | "professors" | "career";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "feed",       label: "Feed",          icon: <Rss className="h-4 w-4 shrink-0" /> },
  { id: "discuss",    label: "Discuss",       icon: <MessageSquare className="h-4 w-4 shrink-0" /> },
  { id: "people",     label: "Find People",   icon: <UserSearch className="h-4 w-4 shrink-0" /> },
  { id: "meetups",    label: "Meetups",       icon: <CalendarDays className="h-4 w-4 shrink-0" /> },
  { id: "voice",      label: "Voice Lounges", icon: <Mic className="h-4 w-4 shrink-0" /> },
  { id: "professors", label: "Professors",    icon: <GraduationCap className="h-4 w-4 shrink-0" /> },
  { id: "career",     label: "Career",        icon: <Briefcase className="h-4 w-4 shrink-0" /> },
];

import FeedTab from "@/pages/community/FeedTab";
import ForumsTab from "@/pages/community/ForumsTab";
import QATab from "@/pages/community/QATab";
import GroupsTab from "@/pages/community/GroupsTab";
import PartnersTab from "@/pages/community/PartnersTab";
import MeetupsTab from "@/pages/community/MeetupsTab";
import VoiceTab from "@/pages/community/VoiceTab";
import ProfessorsTab from "@/pages/Professors";
import CareerTab from "@/pages/Internships";

// ─── Discuss Tab (Forums + Q&A) ──────────────────────────────────────────────
function DiscussTab() {
  const [mode, setMode] = useState<"forums" | "qa">("forums");

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setMode("forums")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "forums" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/20"}`}>
          💬 Forums
        </button>
        <button onClick={() => setMode("qa")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "qa" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/20"}`}>
          ❓ Q&A
        </button>
      </div>
      {mode === "forums" ? <ForumsTab /> : <QATab />}
    </div>
  );
}

// ─── People Tab (Groups + Partners) ──────────────────────────────────────────
function PeopleTab() {
  return (
    <div className="p-6 space-y-0">
      <GroupsTab />
      <div className="border-t border-border/20 my-6" />
      <PartnersTab />
    </div>
  );
}

export default function Community() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(() => localStorage.getItem("community-visited") !== "true");

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["feed", "discuss", "people", "meetups", "voice", "professors", "career"].includes(tabParam)) {
      return tabParam as TabId;
    }
    const saved = localStorage.getItem("community-tab") as string;
    // Map old tab IDs to new ones
    if (saved === "forums" || saved === "qa") return "discuss";
    if (saved === "groups" || saved === "partners") return "people";
    if (["feed", "discuss", "people", "meetups", "voice", "professors", "career"].includes(saved)) return saved as TabId;
    return "feed";
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    localStorage.setItem("community-tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab") as TabId;
    if (tab && tab !== activeTab && ["feed", "discuss", "people", "meetups", "voice", "professors", "career"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const handleTabChange = (newTab: TabId) => {
    if (scrollRef.current) {
      scrollPositions.current[activeTab] = scrollRef.current.scrollTop;
    }
    setActiveTab(newTab);
    navigate(`/community?tab=${newTab}`, { replace: true });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPositions.current[activeTab] || 0;
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100vh-6rem)] w-[calc(100%+2rem)] md:w-full max-w-[1400px] -mx-4 md:mx-auto md:rounded-xl border-y md:border border-border/40 overflow-hidden bg-background">
      
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border-b border-primary/20 p-4 md:p-6 flex items-start gap-4 shrink-0"
        >
          <div className="text-3xl">👋</div>
          <div className="flex-1">
            <p className="font-bold text-sm">Welcome to the Community!</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
              This is where students connect. Ask questions in Q&A, join study groups, find a study partner, or just browse the feed to see what's happening.
            </p>
          </div>
          <button onClick={() => { localStorage.setItem("community-visited", "true"); setShowWelcome(false); }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Tab Bar */}
      <div className="border-b border-border/20 bg-background/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center px-2 md:px-6 gap-1 md:gap-2 overflow-x-auto hide-scrollbar scroll-smooth shrink-0">
          {tabs.map(tab => (
            <div key={tab.id} className="relative">
              <button
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center justify-center gap-1.5 px-3 md:px-4 py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="community-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scroll relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {activeTab === "feed"       && <FeedTab onNavigate={handleTabChange as any} />}
            {activeTab === "discuss"    && <DiscussTab />}
            {activeTab === "people"     && <PeopleTab />}
            {activeTab === "meetups"    && <MeetupsTab />}
            {activeTab === "voice"      && <VoiceTab />}
            {activeTab === "professors" && <ProfessorsTab />}
            {activeTab === "career"     && <CareerTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
