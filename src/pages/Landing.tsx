import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const featureGroups = [
  {
    label: "Study",
    items: [
      { title: "AI Oracle", desc: "Ask anything. Get expert explanations with LaTeX support, PDF analysis, and study plans." },
      { title: "Smart Vault", desc: "Upload lectures and PDFs. AI generates summaries and flashcards automatically." },
      { title: "Notes", desc: "Notion-style notes with Study Mode — quiz yourself on your own notes with AI." },
      { title: "Flashcards", desc: "Spaced repetition flashcards. Generate them from any PDF or note in one click." },
    ],
  },
  {
    label: "Organize",
    items: [
      { title: "Kanban Tasks", desc: "Manage your assignments with drag-and-drop boards. Syncs with your Calendar." },
      { title: "Calendar", desc: "Track exams and deadlines. Get smart reminders 7 days, 3 days, and 1 day before." },
      { title: "Progress", desc: "Track your study streak, weekly activity heatmap, and subject breakdown." },
    ],
  },
  {
    label: "Together",
    items: [
      { title: "Teams", desc: "Collaborate on group projects with shared tasks, whiteboards, and activity feeds." },
      { title: "Messages", desc: "Direct messages with @mentions. Stay connected with your study group." },
    ],
  },
];

const howItWorks = [
  { step: "1", title: "Create your account", desc: "Sign up in 30 seconds. No credit card needed." },
  { step: "2", title: "Set up your space", desc: "Tell us your university and subjects. We personalize everything." },
  { step: "3", title: "Start studying smarter", desc: "Upload files, ask the AI, connect with classmates." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      setScrolled(el.scrollTop > 100);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto bg-[#fbfaf7] text-[#1c1a15] custom-scroll">
      {/* Sticky Nav */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 pt-[calc(1.25rem+env(safe-area-inset-top))] transition-all duration-300 ${scrolled ? "bg-[#fbfaf7]/90 backdrop-blur-md border-b border-black/[0.08]" : ""}`}>
        <button onClick={scrollToTop} className="font-display text-[22px] leading-none tracking-[-0.01em]">
          UniFlow
        </button>
        <Button onClick={() => navigate("/login")} variant="ghost"
          className="h-9 px-4 text-sm font-medium text-[#1c1a15]/70 hover:text-[#1c1a15] hover:bg-black/[0.04] rounded-lg">
          Sign In
        </Button>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 pt-36 md:pt-44 pb-20 md:pb-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-16 lg:gap-10 items-center">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-[3.4rem] leading-[1.02] md:text-[5.25rem] md:leading-[0.98] tracking-[-0.015em] text-balance">
            Stop switching between <span className="italic"><span className="hl-mark">7&nbsp;apps</span></span>.
          </h1>

          <p className="text-[17px] md:text-lg text-black/55 max-w-[42ch] leading-relaxed mt-7 text-pretty">
            UniFlow is the all-in-one platform where students study smarter, collaborate better, and actually enjoy the process.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-7 mt-9">
            <Button onClick={() => navigate("/login?mode=signup")} size="lg"
              className="h-12 px-7 font-medium text-[15px] rounded-lg bg-[#1c1a15] hover:bg-black text-white w-full sm:w-auto">
              Get Started Free
            </Button>
            <button
              className="text-[15px] font-medium text-black/55 hover:text-black underline underline-offset-[6px] decoration-black/25 hover:decoration-black/60 transition-colors text-left sm:text-center"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              See features
            </button>
          </div>

          <p className="text-[13px] text-black/40 mt-8">
            Free forever · Join students already using UniFlow
          </p>
        </motion.div>

        {/* Product artifact: a flashcard from the app's own world */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:block"
          aria-hidden="true"
        >
          <div className="absolute inset-x-8 top-6 bottom-[-14px] bg-white border border-black/[0.08] rounded-xl rotate-[2.5deg] shadow-[0_1px_2px_rgba(28,26,21,0.05)]" />
          <div className="relative bg-white border border-black/[0.1] rounded-xl px-9 py-10 shadow-[0_16px_40px_-16px_rgba(28,26,21,0.18),0_2px_6px_rgba(28,26,21,0.05)] transition-transform duration-500 hover:rotate-[1.5deg]">
            <div className="text-[11px] uppercase tracking-[0.14em] text-black/40 font-medium">Flashcards · Spaced repetition</div>
            <p className="font-display text-[26px] leading-snug mt-5">
              What does the gradient ∇f of a function actually tell you?
            </p>
            <div className="border-t border-dashed border-black/15 my-6" />
            <p className="text-[15px] text-black/50 leading-relaxed">
              The direction of steepest ascent — its magnitude is the rate of that ascent.
            </p>
            <div className="flex items-center gap-2 mt-7">
              <span className="text-[12px] text-black/35">Review again in</span>
              <span className="text-[12px] font-medium text-black/70">3 days</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div id="features" className="border-t border-black/[0.08]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-20 md:py-28">
          <h2 className="font-display text-4xl md:text-[3.4rem] leading-[1.05] tracking-[-0.01em] max-w-[16ch] text-balance">
            Everything a student needs
          </h2>
          <p className="text-black/50 mt-4 text-[15px] md:text-base max-w-[46ch] text-pretty">
            Stop switching between 7 apps. UniFlow has it all.
          </p>

          <div className="mt-14 md:mt-20 space-y-16">
            {featureGroups.map((group) => (
              <div key={group.label} className="md:grid md:grid-cols-[180px_1fr] md:gap-x-12">
                <div className="text-[12px] uppercase tracking-[0.16em] text-black/40 font-medium mb-5 md:mb-0 md:pt-6">
                  {group.label}
                </div>
                <div className="border-t border-black/[0.1]">
                  {group.items.map((f) => (
                    <div key={f.title} className="grid md:grid-cols-[220px_1fr] gap-1.5 md:gap-8 py-6 border-b border-black/[0.07]">
                      <h3 className="font-semibold text-[15px]">{f.title}</h3>
                      <p className="text-black/55 text-[15px] leading-relaxed max-w-[52ch]">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="border-t border-black/[0.08]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-20 md:py-28">
          <h2 className="font-display text-4xl md:text-[3.4rem] leading-[1.05] tracking-[-0.01em] text-balance">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-10 mt-14 md:mt-20">
            {howItWorks.map((item) => (
              <div key={item.step} className="border-t-2 border-[#1c1a15] pt-6">
                <div className="font-display italic text-2xl text-black/35 mb-4">{item.step}</div>
                <h3 className="font-semibold text-[15px] mb-2">{item.title}</h3>
                <p className="text-black/55 text-[15px] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-black/[0.08]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-24 md:py-32">
          <h2 className="font-display text-4xl md:text-[3.6rem] leading-[1.05] tracking-[-0.01em] max-w-[18ch] text-balance">
            Ready to study smarter?
          </h2>
          <p className="text-black/50 mt-4 text-[15px] md:text-base max-w-[46ch]">
            Join students who stopped juggling 7 apps.
          </p>
          <div className="mt-9">
            <Button onClick={() => navigate("/login?mode=signup")} size="lg"
              className="h-12 px-7 bg-[#1c1a15] hover:bg-black text-white font-medium text-[15px] rounded-lg">
              Get Started — It's Free
            </Button>
          </div>
          <p className="text-black/35 text-[13px] mt-6">No credit card · No download · Works in your browser</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-black/[0.08]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="font-display text-lg">UniFlow</span>
          <p className="text-black/40 text-[13px]">
            The Student Operating System · Built for students, by students
          </p>
        </div>
      </footer>
    </div>
  );
}
