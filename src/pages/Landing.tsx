import { motion } from "framer-motion";
import {
  ArrowUp,
  Brain,
  BookOpen,
  PenLine,
  CheckSquare,
  Calendar,
  Layers,
  Users,
  LineChart,
  MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const features = [
  { icon: Brain, title: "AI Oracle", desc: "Ask anything. Get expert explanations with LaTeX support, PDF analysis, and study plans.", popular: true },
  { icon: BookOpen, title: "Smart Vault", desc: "Upload lectures and PDFs. AI generates summaries and flashcards automatically." },
  { icon: PenLine, title: "Notes", desc: "Notion-style notes with Study Mode — quiz yourself on your own notes with AI." },
  { icon: CheckSquare, title: "Kanban Tasks", desc: "Manage your assignments with drag-and-drop boards. Syncs with your Calendar." },
  { icon: Calendar, title: "Calendar", desc: "Track exams and deadlines. Get smart reminders 7 days, 3 days, and 1 day before." },
  { icon: Layers, title: "Flashcards", desc: "Spaced repetition flashcards. Generate them from any PDF or note in one click." },
  { icon: Users, title: "Teams", desc: "Collaborate on group projects with shared tasks, whiteboards, and activity feeds." },
  { icon: LineChart, title: "Progress", desc: "Track your study streak, weekly activity heatmap, and subject breakdown." },
  { icon: MessagesSquare, title: "Messages", desc: "Direct messages with @mentions. Stay connected with your study group." },
];

const howItWorks = [
  { step: "01", title: "Create your account", desc: "Sign up in 30 seconds. No credit card needed." },
  { step: "02", title: "Set up your space", desc: "Tell us your university and subjects. We personalize everything." },
  { step: "03", title: "Start studying smarter", desc: "Upload files, ask the AI, connect with classmates." },
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
    <div ref={scrollRef} className="h-screen overflow-y-auto bg-[#fafaf9] text-[#161616] custom-scroll">
      {/* Sticky Nav */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 pt-[calc(1rem+env(safe-area-inset-top))] transition-all duration-300 ${scrolled ? "bg-[#fafaf9]/85 backdrop-blur-md border-b border-black/[0.08]" : ""}`}>
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={scrollToTop}>
          <div className="h-6 w-6 rounded-[6px] bg-[#161616] flex items-center justify-center text-white font-semibold text-[11px]">U</div>
          <span className="font-semibold tracking-tight">UniFlow</span>
        </div>
        <Button onClick={() => navigate("/login")} className="h-9 px-5 text-sm font-medium bg-[#161616] hover:bg-black text-white rounded-full">
          Sign In
        </Button>
      </div>

      {/* Hero */}
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-7 max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-black/40 font-medium">
            Built for students, by students
          </p>

          <h1 className="text-[2.6rem] md:text-6xl font-semibold tracking-[-0.03em] leading-[1.08]">
            Stop switching<br />between 7 apps.
          </h1>

          <p className="text-base md:text-lg text-black/50 max-w-md mx-auto leading-relaxed">
            UniFlow is the all-in-one platform where students study smarter, collaborate better, and actually enjoy the process.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
            <Button onClick={() => navigate("/login?mode=signup")} size="lg"
              className="h-11 px-7 font-medium text-sm rounded-full bg-[#161616] hover:bg-black text-white w-full sm:w-auto">
              Get Started Free
            </Button>
            <button
              className="text-sm font-medium text-black/50 hover:text-black underline-offset-4 hover:underline transition-colors"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              See features ↓
            </button>
          </div>

          <p className="text-xs text-black/35 pt-3">
            Free forever · Join students already using UniFlow
          </p>
        </motion.div>
      </div>

      {/* Features */}
      <div id="features" className="px-6 pb-28 max-w-5xl mx-auto">
        <div className="mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Everything a student needs</h2>
          <p className="text-black/45 mt-2 text-sm md:text-base">Stop switching between 7 apps. UniFlow has it all.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-black/[0.08] border border-black/[0.08] rounded-2xl overflow-hidden">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }} viewport={{ once: true, margin: "-50px" }}
              className="relative bg-[#fafaf9] p-7 hover:bg-white transition-colors">
              {"popular" in f && f.popular && (
                <span className="absolute top-7 right-7 text-[10px] uppercase tracking-[0.14em] text-black/35 font-medium">Popular</span>
              )}
              <f.icon className="h-5 w-5 text-black/70 mb-5" strokeWidth={1.5} />
              <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
              <p className="text-black/50 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <button onClick={scrollToTop} className="inline-flex items-center gap-2 text-xs text-black/35 hover:text-black/60 transition-colors">
            <ArrowUp className="h-3.5 w-3.5" /> Back to top
          </button>
        </div>
      </div>

      {/* How It Works */}
      <div className="border-t border-black/[0.08]">
        <div className="py-24 px-6 max-w-5xl mx-auto">
          <div className="mb-14">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="text-black/45 mt-2 text-sm md:text-base">Get started in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {howItWorks.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                className="border-t border-black/[0.12] pt-6">
                <div className="text-xs font-medium text-black/35 mb-3">{item.step}</div>
                <h3 className="font-semibold text-sm mb-1.5">{item.title}</h3>
                <p className="text-black/50 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-black/[0.08] py-28 px-6 text-center">
        <div className="max-w-xl mx-auto space-y-5">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em]">Ready to study smarter?</h2>
          <p className="text-black/45 text-sm md:text-base">Join students who stopped juggling 7 apps.</p>
          <div className="pt-3">
            <Button onClick={() => navigate("/login?mode=signup")} size="lg"
              className="h-12 px-9 bg-[#161616] hover:bg-black text-white font-medium text-sm rounded-full">
              Get Started — It's Free
            </Button>
          </div>
          <p className="text-black/30 text-xs">No credit card · No download · Works in your browser</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-black/[0.08] py-10 px-6 text-center text-black/35 text-xs">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-5 w-5 rounded-[5px] bg-[#161616] flex items-center justify-center text-white font-semibold text-[9px]">U</div>
          <span className="font-medium text-black/50">UniFlow</span>
        </div>
        <p>The Student Operating System</p>
      </footer>
    </div>
  );
}
