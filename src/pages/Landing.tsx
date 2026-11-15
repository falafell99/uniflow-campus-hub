import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const tools = [
  { n: "01", name: "AI Oracle", desc: "Ask anything. Expert explanations with LaTeX support, PDF analysis, and study plans." },
  { n: "02", name: "Smart Vault", desc: "Upload lectures and PDFs. AI generates summaries and flashcards automatically." },
  { n: "03", name: "Notes", desc: "Notion-style notes with Study Mode — quiz yourself on your own notes with AI." },
  { n: "04", name: "Kanban Tasks", desc: "Drag-and-drop boards for assignments. Syncs with your Calendar." },
  { n: "05", name: "Calendar", desc: "Exams and deadlines with smart reminders 7, 3, and 1 day before." },
  { n: "06", name: "Flashcards", desc: "Spaced repetition. Generate a deck from any PDF or note in one click." },
  { n: "07", name: "Teams", desc: "Group projects with shared tasks, whiteboards, and activity feeds." },
  { n: "08", name: "Progress", desc: "Study streak, weekly activity heatmap, and subject breakdown." },
  { n: "09", name: "Messages", desc: "Direct messages with @mentions for your study group." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => setScrolled(el.scrollTop > 40);
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto bg-white text-[#111] custom-scroll">
      {/* Top bar: wordmark + sign-in link, no button chrome */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${scrolled ? "bg-white/95 border-b border-black/10" : ""}`}>
        <div className="max-w-[680px] mx-auto px-6 flex items-baseline justify-between py-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <span className="font-grotesk font-bold text-[17px] tracking-[-0.01em]">UniFlow</span>
          <button
            onClick={() => navigate("/login")}
            className="text-[14px] text-black/60 hover:text-black underline underline-offset-[5px] decoration-black/25 hover:decoration-black transition-colors">
            Sign in
          </button>
        </div>
      </div>

      <main className="max-w-[680px] mx-auto px-6 pt-32 md:pt-40 pb-16">
        {/* Definition: one sentence, then actions as plain links */}
        <h1 className="font-grotesk font-bold text-[34px] md:text-[44px] leading-[1.08] tracking-[-0.02em] text-balance">
          The student operating system.
        </h1>
        <p className="mt-6 text-[16px] md:text-[17px] leading-[1.65] text-black/65 max-w-[54ch] text-pretty">
          Notes, flashcards, kanban, calendar, a document vault, an AI tutor, teams and messages — the seven apps you switch between, in one place. Free forever.
        </p>

        <div className="mt-9 flex items-baseline gap-8 text-[15px] font-medium">
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

        {/* Index of what's inside */}
        <div className="mt-16 md:mt-24 border-t border-black/15">
          <div className="flex items-baseline justify-between pt-4 pb-2">
            <span className="text-[13px] font-medium text-black/45">What's inside</span>
            <span className="text-[13px] text-black/35 tabular-nums">9 tools</span>
          </div>
          <ol>
            {tools.map((t) => (
              <li key={t.n} className="group border-t border-black/[0.07] py-[18px] grid grid-cols-[32px_1fr] md:grid-cols-[44px_180px_1fr] gap-x-4 gap-y-1 items-baseline">
                <span className="text-[13px] text-black/35 tabular-nums">{t.n}</span>
                <h2 className="font-grotesk font-medium text-[15px] tracking-[-0.005em]">{t.name}</h2>
                <p className="col-start-2 md:col-start-3 text-[14px] leading-relaxed text-black/55 text-pretty">{t.desc}</p>
              </li>
            ))}
          </ol>
          <div className="border-t border-black/[0.07]" />
        </div>

        {/* How to start: one line, not a section */}
        <p className="mt-14 text-[14px] leading-relaxed text-black/55 max-w-[54ch] text-pretty">
          Sign up in 30 seconds with your university email, tell us your subjects, and your space is set up. No credit card, no download — it works in the browser.
        </p>

        <div className="mt-14 border-t border-black/15 pt-5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <span className="font-grotesk font-bold text-[14px]">UniFlow</span>
          <span className="text-[13px] text-black/40">Built for students, by students · ELTE, Budapest</span>
        </div>
      </main>
    </div>
  );
}
