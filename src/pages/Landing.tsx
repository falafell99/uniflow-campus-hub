import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Hero */}
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(123,104,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(123,104,238,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#7b68ee] flex items-center justify-center text-white font-black text-sm">U</div>
            <span className="font-bold text-white">UniFlow</span>
          </div>
          <Button onClick={() => navigate("/login")} className="bg-[#7b68ee] hover:bg-[#6a5acd] text-white h-9 px-5 text-sm font-semibold">
            Sign In
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-[#7b68ee]/10 border border-[#7b68ee]/20 rounded-full px-4 py-1.5 text-sm text-[#7b68ee] font-medium">
            <Sparkles className="h-3.5 w-3.5" /> The Student OS
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.05]">
            One place for<br />
            <span className="text-[#7b68ee]">everything</span> you study
          </h1>

          <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            Notes, tasks, AI tutor, flashcards, and team collaboration — all in one platform built for students.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={() => navigate("/login")} size="lg" className="h-12 px-8 bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold text-base rounded-xl shadow-lg shadow-[#7b68ee]/20">
              Get Started Free
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 border-white/10 text-white hover:bg-white/5 font-semibold text-base rounded-xl"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              See Features ↓
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-white">Everything a student needs</h2>
          <p className="text-white/40 mt-3">Stop switching between 7 apps. UniFlow has it all.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} viewport={{ once: true }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-[#7b68ee]/20 transition-all">
              <div className="text-2xl mb-3">{f.emoji}</div>
              <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-black text-white">Ready to get organised?</h2>
          <p className="text-white/40">Join students who use UniFlow to study smarter.</p>
          <Button onClick={() => navigate("/login")} size="lg" className="h-12 px-10 bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold text-base rounded-xl shadow-lg shadow-[#7b68ee]/20">
            Start for Free →
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6 text-center text-white/20 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-5 w-5 rounded-md bg-[#7b68ee] flex items-center justify-center text-white font-black text-[10px]">U</div>
          <span className="font-bold text-white/40">UniFlow</span>
        </div>
        <p>The Student Operating System</p>
      </footer>
    </div>
  );
}
