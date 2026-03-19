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
  const { user } = useAuth();
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
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    navigate(firstAction === "vault" ? "/vault" : firstAction === "calendar" ? "/calendar" : firstAction === "notes" ? "/notes" : "/");
  };

  const skip = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    navigate("/");
  };

  const dots = (
    <div className="flex items-center gap-2 mb-10">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-2 bg-muted/40"}`} />
      ))}
    </div>
  );

  const transition = { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.3 } };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {dots}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" {...transition} className="flex flex-col items-center text-center max-w-md space-y-6">
            <span className="text-6xl">🎓</span>
            <h1 className="text-3xl font-black tracking-tight">Welcome to UniFlow</h1>
            <p className="text-muted-foreground">Your personal student OS. Let's set up your space in 4 quick steps.</p>
            <Button size="lg" className="h-12 px-8 bg-primary text-primary-foreground font-bold rounded-xl" onClick={() => setStep(1)}>
              Get Started →
            </Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" {...transition} className="flex flex-col items-center text-center max-w-sm w-full space-y-5">
            <h2 className="text-2xl font-bold">Tell us about yourself</h2>
            <div className="w-full space-y-3 text-left">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Display name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">University</label>
                <Input value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. ELTE, BME, Corvinus" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Faculty / Department</label>
                <Input value={faculty} onChange={e => setFaculty(e.target.value)} placeholder="e.g. Faculty of Informatics" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Year of study</label>
                <select value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)} className="mt-1 w-full bg-transparent border border-border/40 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="" className="bg-[#1a1a1a]">Select year...</option>
                  {YEARS.map(y => <option key={y} value={y} className="bg-[#1a1a1a]">{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Major</label>
                <Input value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science" className="mt-1" />
              </div>
            </div>
            <Button className="w-full h-11 font-bold" onClick={async () => { if (await saveProfile()) setStep(2); }}>Next →</Button>
            <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Skip setup</button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" {...transition} className="flex flex-col items-center text-center max-w-sm w-full space-y-5">
            <h2 className="text-2xl font-bold">What do you want to do first?</h2>
            <p className="text-sm text-muted-foreground">Pick one to get started — you can always do the rest later.</p>
            <div className="grid grid-cols-1 gap-3 w-full">
              {([
                { key: "vault" as const, emoji: "📚", title: "Upload a lecture", desc: "Store your PDFs and notes in the Vault" },
                { key: "calendar" as const, emoji: "📅", title: "Add a deadline", desc: "Track exams and assignments in Calendar" },
                { key: "notes" as const, emoji: "📝", title: "Create a note", desc: "Write and organize your study notes" },
              ]).map(c => (
                <button key={c.key} onClick={() => setFirstAction(c.key)}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${firstAction === c.key ? "border-primary bg-primary/10" : "border-border/40 hover:border-border"}`}>
                  <div className="text-2xl mb-2">{c.emoji}</div>
                  <p className="font-bold text-sm">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                </button>
              ))}
            </div>
            <Button className="w-full h-11 font-bold" disabled={!firstAction} onClick={() => setStep(3)}>Next →</Button>
            <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Skip setup</button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" {...transition} className="flex flex-col items-center text-center max-w-sm w-full space-y-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl">
              ✓
            </motion.div>
            <h2 className="text-2xl font-bold">You're all set!</h2>
            <p className="text-muted-foreground">UniFlow is ready. Let's go.</p>
            <Button size="lg" className="w-full h-12 font-bold bg-primary" onClick={handleFinish}>Open UniFlow →</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
