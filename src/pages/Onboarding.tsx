import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "PhD", "Other"];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Profile fields
  const [name, setName] = useState(user?.user_metadata?.display_name || "");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [major, setMajor] = useState("");

  // Step 3
  const [firstAction, setFirstAction] = useState<"vault" | "calendar" | "notes" | "">("");

  const saveProfile = async () => {
    if (!user || !name.trim()) { toast.error("Display name is required"); return false; }
    const { error } = await supabase.from("profiles").update({
      display_name: name.trim(), university, faculty, year_of_study: yearOfStudy, major
    }).eq("id", user.id);
    if (error) { toast.error("Could not save profile"); return false; }
    await refreshProfile();
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    await refreshProfile();
    // Wait a tick for React state to reconcile before navigating
    await new Promise(r => setTimeout(r, 100));
    const dest = firstAction === "vault" ? "/vault" : firstAction === "calendar" ? "/calendar" : firstAction === "notes" ? "/notes" : "/";
    navigate(dest, { replace: true });
  };

  const skip = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    await refreshProfile();
    await new Promise(r => setTimeout(r, 100));
    navigate("/", { replace: true });
  };

  const totalSteps = 4;
  const currentStep = step + 1;

  const actionCards = [
    { key: "vault" as const, emoji: "📚", title: "Upload a lecture", desc: "Store your PDFs and notes in the Vault" },
    { key: "calendar" as const, emoji: "📅", title: "Add a deadline", desc: "Track exams and assignments in Calendar" },
    { key: "notes" as const, emoji: "📝", title: "Create a note", desc: "Write and organize your study notes" },
  ];

  return (
    <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(123,104,238,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(123,104,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(123,104,238,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Progress Indicator */}
      <div className="w-full max-w-sm mb-8 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/40">Step {currentStep} of {totalSteps}</span>
          <span className="text-xs text-white/40">{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#7b68ee] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Step Transitions */}
      <AnimatePresence mode="wait">
        {/* STEP 0 — Welcome */}
        {step === 0 && (
          <motion.div
            key="s0"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full max-w-sm flex flex-col items-center text-center space-y-6 relative z-10"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="h-20 w-20 rounded-3xl bg-[#7b68ee] flex items-center justify-center text-white font-black text-4xl mb-2 shadow-2xl shadow-[#7b68ee]/30 mx-auto"
            >
              U
            </motion.div>
            <h1 className="text-3xl font-black text-white text-center">Welcome to UniFlow</h1>
            <p className="text-white/50 text-center leading-relaxed">
              Your personal student OS. Notes, tasks, AI tutor, and your study community — all in one place.
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full h-12 rounded-xl bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold transition-all active:scale-95"
            >
              Get Started →
            </button>
          </motion.div>
        )}

        {/* STEP 1 — Profile */}
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full max-w-sm relative z-10"
          >
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Tell us about yourself</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 font-medium">Display name *</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7b68ee]/60" />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium">University</label>
                  <Input value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. ELTE, BME, Corvinus"
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7b68ee]/60" />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium">Faculty / Department</label>
                  <Input value={faculty} onChange={e => setFaculty(e.target.value)} placeholder="e.g. Faculty of Informatics"
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7b68ee]/60" />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium">Year of study</label>
                  <select value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#7b68ee]/60">
                    <option value="" className="bg-[#0a0a0a]">Select year...</option>
                    {YEARS.map(y => <option key={y} value={y} className="bg-[#0a0a0a]">{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium">Major</label>
                  <Input value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science"
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7b68ee]/60" />
                </div>
              </div>
            </div>
            <button
              className="w-full h-12 rounded-xl bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold transition-all active:scale-95 mt-5"
              onClick={async () => { if (await saveProfile()) setStep(2); }}
            >
              Next →
            </button>
            <button onClick={skip} className="text-xs text-white/30 hover:text-white/50 transition-colors mt-4 block text-center w-full">
              Skip setup
            </button>
          </motion.div>
        )}

        {/* STEP 2 — First Action */}
        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full max-w-sm relative z-10 space-y-5"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">What do you want to do first?</h2>
              <p className="text-sm text-white/40 mt-2">Pick one to get started — you can always do the rest later.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full">
              {actionCards.map((card, i) => (
                <motion.button
                  key={card.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setFirstAction(card.key)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    firstAction === card.key
                      ? "border-[#7b68ee] bg-[#7b68ee]/10"
                      : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                  }`}
                >
                  <span className="text-2xl">{card.emoji}</span>
                  <p className="font-bold text-white mt-2">{card.title}</p>
                  <p className="text-sm text-white/40 mt-0.5">{card.desc}</p>
                </motion.button>
              ))}
            </div>
            <button
              className="w-full h-12 rounded-xl bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!firstAction}
              onClick={() => setStep(3)}
            >
              Next →
            </button>
            <button onClick={skip} className="text-xs text-white/30 hover:text-white/50 transition-colors mt-4 block text-center w-full">
              Skip setup
            </button>
          </motion.div>
        )}

        {/* STEP 3 — Done */}
        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full max-w-sm flex flex-col items-center text-center space-y-6 relative z-10"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, ease: "backOut" }}
              className="h-24 w-24 rounded-full bg-[#7b68ee]/20 border-2 border-[#7b68ee] flex items-center justify-center text-5xl mx-auto"
            >
              ✓
            </motion.div>
            <h2 className="text-2xl font-black text-white text-center">You're all set!</h2>
            <p className="text-white/40 text-center">UniFlow is ready. Let's go.</p>
            <button
              className="w-full h-12 rounded-xl bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold transition-all active:scale-95"
              onClick={handleFinish}
            >
              Open UniFlow →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
