import { useEffect } from "react";
import { FacultyBar } from "@/components/FacultyBar";
import { CategorySidebar } from "@/components/CategorySidebar";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TopHeader } from "@/components/TopHeader";
import { CommandPalette } from "@/components/CommandPalette";
import { ReminderBanner } from "@/components/ReminderBanner";
import { initReminders } from "@/lib/reminders";
import { useAuth } from "@/contexts/AuthContext";

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
        <FacultyBar />
        <CategorySidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <ReminderBanner />
        <main className="flex-1 p-6 overflow-y-auto custom-scroll">
          <div className="page-slide-in">
            {children}
          </div>
        </main>
      </div>
      <ActivityFeed />
    </div>
  );
}

