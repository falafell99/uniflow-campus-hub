import { useEffect } from "react";

import { CategorySidebar } from "@/components/CategorySidebar";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TopHeader } from "@/components/TopHeader";
import { CommandPalette } from "@/components/CommandPalette";
import { ReminderBanner } from "@/components/ReminderBanner";
import { MobileNav } from "@/components/MobileNav";
import { initReminders } from "@/lib/reminders";
import { useAuth } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { PWAUpdatePrompt } from "./PWAUpdatePrompt";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      initReminders(user.id);
      const interval = setInterval(() => initReminders(user.id), 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  return (
    <div className="h-full flex w-full overflow-hidden">
      <CommandPalette />
      <div className="hidden md:flex shrink-0 h-full">

        <CategorySidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopHeader />
        <ReminderBanner />
        <main
          className="flex-1 p-4 md:p-6 md:pb-6 overflow-y-auto custom-scroll"
          style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <div className="page-slide-in h-full">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
      <ActivityFeed />
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </div>
  );
}

