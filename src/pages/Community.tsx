import { useState, useEffect, useRef } from "react";
import { Rss, MessageSquare, HelpCircle, BookOpen, UserSearch, CalendarDays, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Tab Types ────────────────────────────────────────────────────────────────
type TabId = "feed" | "forums" | "qa" | "groups" | "partners" | "meetups" | "voice";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "feed",     label: "Feed",           icon: <Rss className="h-4 w-4 shrink-0" /> },
  { id: "forums",   label: "Forums",         icon: <MessageSquare className="h-4 w-4 shrink-0" /> },
  { id: "qa",       label: "Q&A",            icon: <HelpCircle className="h-4 w-4 shrink-0" /> },
  { id: "groups",   label: "Study Groups",   icon: <BookOpen className="h-4 w-4 shrink-0" /> },
  { id: "partners", label: "Study Partners", icon: <UserSearch className="h-4 w-4 shrink-0" /> },
  { id: "meetups",  label: "Meetups",        icon: <CalendarDays className="h-4 w-4 shrink-0" /> },
  { id: "voice",    label: "Voice Lounges",  icon: <Mic className="h-4 w-4 shrink-0" /> },
];

import FeedTab from "@/pages/community/FeedTab";
import ForumsTab from "@/pages/community/ForumsTab";
import QATab from "@/pages/community/QATab";
import GroupsTab from "@/pages/community/GroupsTab";
import PartnersTab from "@/pages/community/PartnersTab";
import MeetupsTab from "@/pages/community/MeetupsTab";
import VoiceTab from "@/pages/community/VoiceTab";

export default function Community() {
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    (localStorage.getItem("community-tab") as TabId) || "feed"
  );
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    localStorage.setItem("community-tab", activeTab);
  }, [activeTab]);

  const handleTabChange = (newTab: TabId) => {
    if (scrollRef.current) {
      scrollPositions.current[activeTab] = scrollRef.current.scrollTop;
    }
    setActiveTab(newTab);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPositions.current[activeTab] || 0;
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100vh-6rem)] w-[calc(100%+2rem)] md:w-full max-w-[1400px] -mx-4 md:mx-auto md:rounded-xl border-y md:border border-border/40 overflow-hidden bg-background">
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
            {activeTab === "feed"     && <FeedTab onNavigate={handleTabChange} />}
            {activeTab === "forums"   && <ForumsTab />}
            {activeTab === "qa"       && <QATab />}
            {activeTab === "groups"   && <GroupsTab />}
            {activeTab === "partners" && <PartnersTab />}
            {activeTab === "meetups"  && <MeetupsTab />}
            {activeTab === "voice"    && <VoiceTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
