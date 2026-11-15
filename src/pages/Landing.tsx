import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";

const TOOLS = [
  { emoji: "🧠", title: "AI Oracle", desc: "Ask anything. Get expert explanations with LaTeX support, PDF analysis, and study plans." },
  { emoji: "📚", title: "Smart Vault", desc: "Upload lectures and PDFs. AI generates summaries and flashcards automatically." },
  { emoji: "📝", title: "Notes", desc: "Notion-style notes with Study Mode — quiz yourself on your own notes with AI." },
  { emoji: "✅", title: "Kanban Tasks", desc: "Manage your assignments with drag-and-drop boards. Syncs with your Calendar." },
  { emoji: "📅", title: "Calendar", desc: "Track exams and deadlines. Get smart reminders 7 days, 3 days, and 1 day before." },
  { emoji: "🃏", title: "Flashcards", desc: "Spaced repetition flashcards. Generate them from any PDF or note in one click." },
  { emoji: "👥", title: "Teams", desc: "Collaborate on group projects with shared tasks, whiteboards, and activity feeds." },
  { emoji: "📊", title: "Progress", desc: "Track your study streak, weekly activity heatmap, and subject breakdown." },
  { emoji: "💬", title: "Messages", desc: "Direct messages with @mentions. Stay connected with your study group." },
];

const STEPS = [
  { step: "01", title: "Create your account", desc: "Sign up in 30 seconds. No credit card needed." },
  { step: "02", title: "Set up your space", desc: "Tell us your university and subjects. We personalize everything." },
  { step: "03", title: "Start studying smarter", desc: "Upload files, ask the AI, connect with classmates." },
];

const SIDEBAR_STUDY = [
  { emoji: "🏠", name: "Dashboard", active: true },
  { emoji: "📝", name: "Notes" },
  { emoji: "✅", name: "Tasks" },
  { emoji: "🤖", name: "AI Oracle" },
  { emoji: "📚", name: "The Vault" },
  { emoji: "🃏", name: "Flashcards" },
  { emoji: "📅", name: "Campus Calendar" },
  { emoji: "📈", name: "Progress" },
];

const SIDEBAR_CAMPUS = [
  { emoji: "🌐", name: "Community" },
  { emoji: "👥", name: "Teams Hub" },
  { emoji: "💬", name: "Messages" },
];

const MOCK_TASKS = [
  { title: "Review cell structure flashcards", subject: "Biology" },
  { title: "Read chapter 7 — Thermodynamics", subject: "Physics" },
  { title: "Draft history essay outline", subject: "History" },
];

const MOCK_DEADLINES = [
  { days: "2d", title: "Physics midterm", when: "Mar 18, 10:00 AM", hot: true },
  { days: "5d", title: "History essay due", when: "Mar 21, 11:59 PM", hot: false },
];

/* A faithful, static recreation of the app's Today screen (src/pages/Today.tsx)
   with generic sample content. Non-interactive on purpose. */
function TodayScreen() {
  return (
    <div className="flex bg-[#f4f6f9] text-[#1c2333] select-none pointer-events-none" aria-hidden="true">
      {/* Sidebar, mirrors AppSidebar */}
      <div className="hidden md:block w-48 shrink-0 bg-white border-r border-[#e4e9f0] py-4 px-3">
        <div className="flex items-center gap-2 px-2 pb-4">
          <div className="h-6 w-6 rounded-md bg-[#3b82f6] flex items-center justify-center text-white font-bold text-[11px]">U</div>
          <span className="font-bold text-[13px]">UniFlow</span>
        </div>
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8a94a8]">Study</p>
        {SIDEBAR_STUDY.map((item) => (
          <div
            key={item.name}
            className={`flex items-center gap-2 px-2 py-[5px] rounded-md text-[12px] font-medium ${
              item.active ? "bg-[#ebf2fe] text-[#2f6fdd]" : "text-[#4a5468]"
            }`}
          >
            <span className="text-[13px]">{item.emoji}</span>
            {item.name}
          </div>
        ))}
        <p className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8a94a8]">Campus</p>
        {SIDEBAR_CAMPUS.map((item) => (
          <div key={item.name} className="flex items-center gap-2 px-2 py-[5px] rounded-md text-[12px] font-medium text-[#4a5468]">
            <span className="text-[13px]">{item.emoji}</span>
            {item.name}
          </div>
        ))}
      </div>

      {/* Today page */}
      <div className="flex-1 min-w-0 px-5 py-6 md:px-7">
        <h3 className="text-[20px] font-extrabold tracking-tight">Good morning 👋</h3>
        <p className="text-[12px] text-[#6b7686] mt-0.5">Monday, March 16 · 3 tasks pending</p>

        {/* Focus card */}
        <div className="mt-4 bg-[#3b82f6]/[0.06] border border-[#3b82f6]/25 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
            <span className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider">Focus for today</span>
          </div>
          <p className="font-bold text-[15px] leading-snug">Calculus — Problem Set 4</p>
          <p className="text-[12px] text-[#6b7686] mt-1">📋 due in 2 days</p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 bg-[#3b82f6] text-white text-[12px] font-semibold rounded-lg px-3 py-1.5">
            Work on this →
          </div>
        </div>

        {/* Tasks */}
        <div className="mt-3 bg-white border border-[#e4e9f0] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#eef1f5]">
            <span className="font-bold text-[12px]">☑ Today's Tasks</span>
            <span className="text-[11px] font-semibold text-[#3b82f6]">View all →</span>
          </div>
          {MOCK_TASKS.map((t) => (
            <div key={t.title} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f2f4f8] last:border-0">
              <div className="h-4 w-4 rounded border-2 border-[#d3dae4] shrink-0" />
              <span className="text-[12px] font-medium flex-1 truncate">{t.title}</span>
              <span className="text-[10px] text-[#6b7686] border border-[#e4e9f0] rounded-md px-1.5 py-0.5 shrink-0">{t.subject}</span>
            </div>
          ))}
        </div>

        {/* Deadlines */}
        <div className="mt-3 bg-white border border-[#e4e9f0] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#eef1f5]">
            <span className="font-bold text-[12px]">🗓 Upcoming Deadlines</span>
            <span className="text-[11px] font-semibold text-[#3b82f6]">Calendar →</span>
          </div>
          {MOCK_DEADLINES.map((d) => (
            <div key={d.title} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f2f4f8] last:border-0">
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                d.hot ? "bg-orange-500/10 text-orange-500" : "bg-[#f0f2f6] text-[#6b7686]"
              }`}>
                {d.days}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate">{d.title}</p>
                <p className="text-[11px] text-[#6b7686]">{d.when}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Streak */}
        <div className="mt-3 flex items-center gap-3 p-3.5 bg-white border border-[#e4e9f0] rounded-2xl">
          <span className="text-[22px]">🔥</span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[13px]">6 day streak</p>
            <p className="text-[11px] text-[#6b7686] truncate">Keep it going — do something today</p>
          </div>
          <span className="text-[11px] font-semibold text-[#3b82f6] shrink-0">Stats →</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "UniFlow | Student Collaboration Ecosystem";
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-[#fafaf8] text-[#16161a] custom-scroll">
      {/* Static header */}
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-5">
        <span className="font-bold text-[17px] tracking-[-0.01em]">UniFlow</span>
        <button
          onClick={() => navigate("/login")}
          className="text-[14px] text-black/60 hover:text-black underline underline-offset-[5px] decoration-black/25 transition-colors"
        >
          Sign in
        </button>
      </header>

      {/* Intro */}
      <section className="max-w-5xl mx-auto px-6 pt-10 md:pt-16 pb-12 md:pb-16">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="max-w-xl">
          <h1 className="font-extrabold text-[32px] md:text-[40px] leading-[1.12] tracking-[-0.02em]">
            The student operating system.
          </h1>
          <p className="mt-5 text-[16px] md:text-[17px] leading-[1.65] text-black/60 max-w-[52ch]">
            Notes, flashcards, kanban, calendar, a document vault, an AI tutor, teams and messages — in one place, free forever.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <button
              onClick={() => navigate("/login?mode=signup")}
              className="h-10 px-5 rounded-lg bg-[#3b82f6] hover:bg-[#2f6fdd] text-white text-[14px] font-semibold transition-colors"
            >
              Create an account
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-[14px] text-black/55 hover:text-black underline underline-offset-[5px] decoration-black/25 transition-colors"
            >
              Sign in
            </button>
          </div>
        </motion.div>
      </section>

      {/* The product itself */}
      <section className="max-w-5xl mx-auto px-6 pb-16 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="rounded-2xl border border-black/10 overflow-hidden"
        >
          <TodayScreen />
        </motion.div>
        <p className="mt-3 text-[12px] text-black/40">The Today screen — the first thing you see when you open UniFlow.</p>
      </section>

      {/* Tools */}
      <section className="max-w-5xl mx-auto px-6 pb-16 md:pb-24">
        <h2 className="font-bold text-[20px] tracking-[-0.01em]">Everything in one place</h2>
        <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-7">
          {TOOLS.map((t) => (
            <div key={t.title}>
              <p className="font-semibold text-[15px]"><span className="mr-2">{t.emoji}</span>{t.title}</p>
              <p className="mt-1.5 text-[14px] leading-[1.6] text-black/55">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-16 md:pb-24">
        <h2 className="font-bold text-[20px] tracking-[-0.01em]">How it works</h2>
        <div className="mt-6 border-t border-black/10">
          {STEPS.map((s) => (
            <div key={s.step} className="flex items-baseline gap-6 py-5 border-b border-black/[0.07]">
              <span className="text-[13px] font-semibold text-black/35 tabular-nums shrink-0">{s.step}</span>
              <div>
                <p className="font-semibold text-[15px]">{s.title}</p>
                <p className="mt-1 text-[14px] text-black/55">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="max-w-5xl mx-auto px-6 pb-16 md:pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-t border-black/10 pt-10">
          <p className="font-bold text-[20px] tracking-[-0.01em]">Free forever. Start today.</p>
          <button
            onClick={() => navigate("/login?mode=signup")}
            className="h-10 px-5 rounded-lg bg-[#3b82f6] hover:bg-[#2f6fdd] text-white text-[14px] font-semibold transition-colors self-start"
          >
            Create an account
          </button>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 pb-10">
        <p className="text-[12px] text-black/40 border-t border-black/10 pt-6">Built for students, by students</p>
      </footer>
    </div>
  );
}
