import { FacultyBar } from "@/components/FacultyBar";
import { CategorySidebar } from "@/components/CategorySidebar";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TopHeader } from "@/components/TopHeader";
import { CommandPalette } from "@/components/CommandPalette";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex w-full">
      <CommandPalette />
      <FacultyBar />
      <CategorySidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
      <ActivityFeed />
    </div>
  );
}
