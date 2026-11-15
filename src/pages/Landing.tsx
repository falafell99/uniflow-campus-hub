import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ToolPage {
  id: string;
  name: string;
  desc: string;
  details: string[];
}

const TOOLS: ToolPage[] = [
  {
    id: "overview",
    name: "Overview",
    desc: "The student operating system. Notes, flashcards, kanban, calendar, a document vault, an AI tutor, teams and messages — in one place, free forever.",
    details: ["Sign up with your university email", "Tell us your subjects — your space is set up", "No credit card, no download: it works in the browser"],
  },
  { id: "oracle", name: "AI Oracle", desc: "Ask anything. Get expert explanations with LaTeX support, PDF analysis, and study plans.", details: ["LaTeX rendering", "PDF analysis", "Study plans"] },
  { id: "vault", name: "Smart Vault", desc: "Upload lectures and PDFs. AI generates summaries and flashcards automatically.", details: ["Lecture and PDF upload", "Automatic summaries", "Generated flashcards"] },
  { id: "notes", name: "Notes", desc: "Notion-style notes with Study Mode — quiz yourself on your own notes with AI.", details: ["Block editor", "Study Mode", "AI quizzes"] },
  { id: "kanban", name: "Kanban Tasks", desc: "Manage your assignments with drag-and-drop boards. Syncs with your Calendar.", details: ["Drag-and-drop boards", "Calendar sync"] },
  { id: "calendar", name: "Calendar", desc: "Track exams and deadlines. Get smart reminders 7 days, 3 days, and 1 day before.", details: ["Exam and deadline tracking", "Reminders at 7, 3 and 1 days"] },
  { id: "flashcards", name: "Flashcards", desc: "Spaced repetition flashcards. Generate them from any PDF or note in one click.", details: ["Spaced repetition", "One-click deck generation"] },
  { id: "teams", name: "Teams", desc: "Collaborate on group projects with shared tasks, whiteboards, and activity feeds.", details: ["Shared tasks", "Whiteboards", "Activity feeds"] },
  { id: "progress", name: "Progress", desc: "Track your study streak, weekly activity heatmap, and subject breakdown.", details: ["Study streak", "Weekly heatmap", "Subject breakdown"] },
  { id: "messages", name: "Messages", desc: "Direct messages with @mentions. Stay connected with your study group.", details: ["Direct messages", "@mentions"] },
];

export default function Landing() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState("overview");
  const active = TOOLS.find((t) => t.id === activeId) ?? TOOLS[0];

  useEffect(() => {
    document.title = "UniFlow | Student Collaboration Ecosystem";
  }, []);

  const navButton = (t: ToolPage) => {
    const selected = t.id === activeId;
    return (
      <button
        key={t.id}
        onClick={() => setActiveId(t.id)}
        className={`text-left text-[14px] px-3 py-[7px] rounded-md transition-colors w-full ${
          selected
            ? "bg-black/[0.05] font-medium text-black"
            : "text-black/50 hover:text-black hover:bg-black/[0.03]"
        }`}>
        {t.name}
      </button>
    );
  };

  return (
    <div className="h-screen overflow-y-auto bg-white text-[#111] custom-scroll">
      <div className="min-h-full max-w-[960px] mx-auto md:grid md:grid-cols-[220px_minmax(0,1fr)]">

        {/* Product-shaped navigation: the app's own sidebar as the page */}
        <aside className="md:border-r md:border-black/10 md:min-h-screen px-6 md:px-0 min-w-0">
          <div className="md:sticky md:top-0 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-8 md:px-6 pb-4 md:pb-8 flex md:flex-col md:h-screen">
            <div className="flex md:block items-baseline justify-between w-full">
              <span className="font-grotesk font-bold text-[17px] tracking-[-0.01em]">UniFlow</span>
              <button
                onClick={() => navigate("/login")}
                className="md:hidden text-[14px] text-black/60 underline underline-offset-[5px] decoration-black/25">
                Sign in
              </button>
            </div>

            {/* Desktop: vertical nav like the app sidebar */}
            <nav className="hidden md:block mt-10 space-y-[2px] flex-1">
              {TOOLS.map(navButton)}
            </nav>

            <div className="hidden md:block mt-8 pt-6 border-t border-black/10">
              <button
                onClick={() => navigate("/login")}
                className="text-[13px] text-black/50 hover:text-black underline underline-offset-[5px] decoration-black/20 hover:decoration-black/60 transition-colors">
                Sign in
              </button>
              <p className="mt-3 text-[12px] leading-relaxed text-black/35">
                Built for students, by students
              </p>
            </div>
          </div>

          {/* Mobile: horizontal tool switcher */}
          <nav className="md:hidden -mx-6 px-6 pb-4 flex gap-1 overflow-x-auto hide-scrollbar border-b border-black/10">
            {TOOLS.map((t) => {
              const selected = t.id === activeId;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`shrink-0 text-[13px] px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                    selected ? "bg-black/[0.05] font-medium text-black" : "text-black/50"
                  }`}>
                  {t.name}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content for the selected tool */}
        <main className="px-6 md:px-12 pt-10 md:pt-[15vh] pb-20 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <h1 className="font-grotesk font-bold text-[30px] md:text-[38px] leading-[1.1] tracking-[-0.015em]">
                {active.id === "overview" ? "The student operating system." : active.name}
              </h1>

              <p className="mt-6 text-[16px] md:text-[17px] leading-[1.65] text-black/65 max-w-[52ch] text-pretty">
                {active.desc}
              </p>

              {active.details.length > 0 && (
                <ul className="mt-8 border-t border-black/10">
                  {active.details.map((d) => (
                    <li key={d} className="border-b border-black/[0.06] py-3 text-[14px] text-black/60">
                      {d}
                    </li>
                  ))}
                </ul>
              )}

              {active.id === "overview" && (
                <div className="mt-10 flex items-baseline gap-8 text-[15px] font-medium">
                  <button
                    onClick={() => navigate("/login?mode=signup")}
                    className="group text-black underline underline-offset-[6px] decoration-black/40 hover:decoration-black transition-colors">
                    Create an account
                    <span className="inline-block transition-transform group-hover:translate-x-1 ml-1.5">→</span>
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="text-black/55 hover:text-black underline underline-offset-[6px] decoration-black/20 hover:decoration-black/60 transition-colors">
                    Sign in
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <p className="md:hidden mt-16 pt-6 border-t border-black/10 text-[12px] text-black/35">
            Built for students, by students
          </p>
        </main>
      </div>
    </div>
  );
}
