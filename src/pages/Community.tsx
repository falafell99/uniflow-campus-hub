import { useState, useEffect, useRef, useCallback } from "react";
import { Rss, MessageSquare, HelpCircle, BookOpen, UserSearch, CalendarDays, Mic } from "lucide-react";

// ─── Tab Types ────────────────────────────────────────────────────────────────
type TabId = "feed" | "forums" | "qa" | "groups" | "partners" | "meetups" | "voice";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "feed",     label: "Feed",           icon: <Rss className="h-4 w-4" /> },
  { id: "forums",   label: "Forums",         icon: <MessageSquare className="h-4 w-4" /> },
  { id: "qa",       label: "Q&A",            icon: <HelpCircle className="h-4 w-4" /> },
  { id: "groups",   label: "Study Groups",   icon: <BookOpen className="h-4 w-4" /> },
  { id: "partners", label: "Study Partners", icon: <UserSearch className="h-4 w-4" /> },
  { id: "meetups",  label: "Meetups",        icon: <CalendarDays className="h-4 w-4" /> },
  { id: "voice",    label: "Voice Lounges",  icon: <Mic className="h-4 w-4" /> },
];

// ─── Tab imports (lazy re-used from existing page components) ─────────────────
import FeedTab from "@/pages/community/FeedTab";
import ForumsTab from "@/pages/community/ForumsTab";
import QATab from "@/pages/community/QATab";
import GroupsTab from "@/pages/community/GroupsTab";
import PartnersTab from "@/pages/community/PartnersTab";
import MeetupsTab from "@/pages/community/MeetupsTab";
import VoiceTab from "@/pages/community/VoiceTab";

// ─── Main Community Hub ───────────────────────────────────────────────────────
export default function Community() {
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    (localStorage.getItem("community-tab") as TabId) || "feed"
  );

  useEffect(() => {
    localStorage.setItem("community-tab", activeTab);
  }, [activeTab]);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] w-full max-w-[1400px] mx-auto md:rounded-xl border-x md:border-y border-border/40 overflow-hidden bg-background">
      {/* Tab Bar */}
      <div className="border-b border-border/20 bg-background/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center px-6 h-14 gap-1 overflow-x-auto custom-scroll">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {activeTab === "feed"     && <FeedTab onNavigate={setActiveTab} />}
        {activeTab === "forums"   && <ForumsTab />}
        {activeTab === "qa"       && <QATab />}
        {activeTab === "groups"   && <GroupsTab />}
        {activeTab === "partners" && <PartnersTab />}
        {activeTab === "meetups"  && <MeetupsTab />}
        {activeTab === "voice"    && <VoiceTab />}
      </div>
    </div>
  );
}
