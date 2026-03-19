import { motion } from "framer-motion";
import { Sparkles, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const features = [
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
    <div ref={scrollRef} className="h-screen overflow-y-auto bg-background text-foreground custom-scroll">
      {/* Sticky Nav */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm" : ""}`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={scrollToTop}>
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">U</div>
          <span className="font-bold">UniFlow</span>
        </div>
        <Button onClick={() => navigate("/login")} variant="default" className="h-9 px-5 text-sm font-semibold">
          Sign In
        </Button>
      </div>

      {/* Hero */}
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(123,104,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(123,104,238,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 space-y-6 max-w-3xl pt-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium">
            <Sparkles className="h-3.5 w-3.5" /> The Student OS
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
            One place for<br />
            <span className="text-primary">everything</span> you study
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Notes, tasks, AI tutor, flashcards, and team collaboration — all in one platform built for students.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button onClick={() => navigate("/login?mode=signup")} size="lg" className="h-12 px-8 font-bold text-base rounded-xl shadow-lg shadow-primary/20 w-full sm:w-auto">
              Get Started Free
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 font-semibold text-base rounded-xl border-border/50 hover:bg-muted w-full sm:w-auto"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              See Features ↓
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div id="features" className="py-24 px-6 max-w-6xl mx-auto relative relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black">Everything a student needs</h2>
          <p className="text-muted-foreground mt-3">Stop switching between 7 apps. UniFlow has it all.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} viewport={{ once: true }}
              className="bg-card/50 border border-border/50 rounded-2xl p-6 hover:bg-card hover:border-primary/30 transition-all shadow-sm">
              <div className="text-2xl mb-3">{f.emoji}</div>
              <h3 className="font-bold text-sm mb-1">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
        
        {/* Return to top floating button inside features section to ensure discoverability */}
        <div className="mt-16 flex justify-center">
            <Button variant="ghost" onClick={scrollToTop} className="gap-2 text-muted-foreground hover:text-foreground rounded-full px-6 object-center">
              <ArrowUp className="h-4 w-4" /> Back to top
            </Button>
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 px-6 text-center bg-muted/20 border-t border-border/40">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-black">Ready to get organised?</h2>
          <p className="text-muted-foreground">Join students who use UniFlow to study smarter.</p>
          <Button onClick={() => navigate("/login?mode=signup")} size="lg" className="h-12 px-10 font-bold text-base rounded-xl shadow-lg shadow-primary/20">
            Start for Free →
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6 text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-black text-[10px]">U</div>
          <span className="font-bold opacity-70">UniFlow</span>
        </div>
        <p>The Student Operating System</p>
      </footer>
    </div>
  );
}
