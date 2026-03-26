import { motion } from "framer-motion";
import { Sparkles, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const features = [
  { emoji: "🧠", title: "AI Oracle", desc: "Ask anything. Get expert explanations with LaTeX support, PDF analysis, and study plans.", popular: true },
  { emoji: "📚", title: "Smart Vault", desc: "Upload lectures and PDFs. AI generates summaries and flashcards automatically." },
  { emoji: "📝", title: "Notes", desc: "Notion-style notes with Study Mode — quiz yourself on your own notes with AI." },
  { emoji: "✅", title: "Kanban Tasks", desc: "Manage your assignments with drag-and-drop boards. Syncs with your Calendar." },
  { emoji: "📅", title: "Calendar", desc: "Track exams and deadlines. Get smart reminders 7 days, 3 days, and 1 day before." },
  { emoji: "🃏", title: "Flashcards", desc: "Spaced repetition flashcards. Generate them from any PDF or note in one click." },
  { emoji: "👥", title: "Teams", desc: "Collaborate on group projects with shared tasks, whiteboards, and activity feeds." },
  { emoji: "📊", title: "Progress", desc: "Track your study streak, weekly activity heatmap, and subject breakdown." },
  { emoji: "💬", title: "Messages", desc: "Direct messages with @mentions. Stay connected with your study group." },
];

const howItWorks = [
  { step: "01", title: "Create your account", desc: "Sign up in 30 seconds. No credit card needed.", emoji: "✍️" },
  { step: "02", title: "Set up your space", desc: "Tell us your university and subjects. We personalize everything.", emoji: "🎓" },
  { step: "03", title: "Start studying smarter", desc: "Upload files, ask the AI, connect with classmates.", emoji: "🚀" },
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
    <div ref={scrollRef} className="h-screen overflow-y-auto bg-[#030303] text-white custom-scroll">
      {/* Sticky Nav */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 pt-[calc(1rem+env(safe-area-inset-top))] transition-all duration-300 ${scrolled ? "bg-[#030303]/80 backdrop-blur-md border-b border-white/[0.06] shadow-sm" : ""}`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={scrollToTop}>
          <div className="h-7 w-7 rounded-lg bg-[#3b82f6] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[#3b82f6]/20">U</div>
          <span className="font-bold text-white">UniFlow</span>
        </div>
        <Button onClick={() => navigate("/login")} className="h-9 px-5 text-sm font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg">
          Sign In
        </Button>
      </div>

      {/* Hero */}
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(123,104,238,0.08),transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(123,104,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(123,104,238,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 space-y-6 max-w-3xl pt-10">
          {/* Tagline */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full px-4 py-1.5 text-sm text-[#3b82f6] font-medium">
            <Sparkles className="h-3.5 w-3.5" /> Built for students, by students
          </motion.div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.05]">
            Stop switching<br />
            between <span className="text-[#3b82f6]">7 apps.</span>
          </h1>

          <p className="text-xl text-white/40 mt-4 max-w-lg mx-auto leading-relaxed">
            UniFlow is the all-in-one platform where students study smarter, collaborate better, and actually enjoy the process.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button onClick={() => navigate("/login?mode=signup")} size="lg"
              className="h-12 px-8 font-bold text-base rounded-xl shadow-lg shadow-[#3b82f6]/20 w-full sm:w-auto bg-[#3b82f6] hover:bg-[#2563eb] text-white active:scale-95 transition-all">
              Get Started Free
            </Button>
            <Button variant="ghost" size="lg"
              className="h-12 px-8 font-semibold text-base rounded-xl border border-white/20 hover:bg-white/10 text-white w-full sm:w-auto"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              See Features ↓
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-white/30 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {["#3b82f6","#10b981","#f59e0b","#ef4444"].map((color, i) => (
                  <div key={i} className="h-7 w-7 rounded-full border-2 border-[#030303]" style={{ background: color }} />
                ))}
              </div>
              <span>Join students already using UniFlow</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span>🔒 Free forever</span>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div id="features" className="py-24 px-6 max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-white">Everything a student needs</h2>
          <p className="text-white/40 mt-3">Stop switching between 7 apps. UniFlow has it all.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }} viewport={{ once: true, margin: "-50px" }}
              className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-[#3b82f6]/20 transition-all">
              {"popular" in f && f.popular && (
                <div className="absolute -top-2 -right-2 bg-[#3b82f6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Popular</div>
              )}
              <div className="text-2xl mb-3">{f.emoji}</div>
              <h3 className="font-bold text-sm mb-1 text-white">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Button variant="ghost" onClick={scrollToTop} className="gap-2 text-white/30 hover:text-white/60 rounded-full px-6">
            <ArrowUp className="h-4 w-4" /> Back to top
          </Button>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-24 px-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-white text-center mb-4">How it works</h2>
        <p className="text-white/40 text-center mb-16">Get started in 3 simple steps</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {howItWorks.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} viewport={{ once: true }}
              className="text-center space-y-3">
              <div className="text-4xl">{item.emoji}</div>
              <div className="text-[#3b82f6] font-mono text-sm font-bold">{item.step}</div>
              <h3 className="font-bold text-white">{item.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 px-6 text-center border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-4xl font-black text-white">Ready to study smarter?</h2>
          <p className="text-white/40 mt-3">Join students who stopped juggling 7 apps.</p>
          <Button onClick={() => navigate("/login?mode=signup")} size="lg"
            className="mt-8 h-14 px-12 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-lg rounded-2xl shadow-2xl shadow-[#3b82f6]/20 active:scale-95 transition-all">
            Get Started — It's Free →
          </Button>
          <p className="text-white/20 text-xs mt-4">No credit card • No download • Works in your browser</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-6 text-center text-white/30 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-5 w-5 rounded-md bg-[#3b82f6] flex items-center justify-center text-white font-black text-[10px]">U</div>
          <span className="font-bold opacity-70">UniFlow</span>
        </div>
        <p>The Student Operating System</p>
      </footer>
    </div>
  );
}
