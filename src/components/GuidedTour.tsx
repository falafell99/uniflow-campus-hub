import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

// ─── Tour Steps ───────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    id: "sidebar",
    title: "Your navigation",
    description: "Everything is here. Study tools on top, your campus community below. Click anything to explore.",
    target: "[data-tour='sidebar']",
    position: "right" as const,
  },
  {
    id: "oracle",
    title: "Meet AI Oracle 🧠",
    description: "Your personal AI tutor. Ask anything — math, code, theory. Upload a PDF and ask questions about it.",
    target: "[data-tour='ai-oracle']",
    position: "right" as const,
  },
  {
    id: "vault",
    title: "The Vault 📚",
    description: "Upload lecture PDFs, notes, past exams. AI can summarize them instantly. Other students share files here too.",
    target: "[data-tour='vault']",
    position: "right" as const,
  },
  {
    id: "community",
    title: "Your campus community 👥",
    description: "Forums, Q&A, Study Groups, Voice Lounges — connect with students studying the same subjects.",
    target: "[data-tour='community']",
    position: "right" as const,
  },
  {
    id: "dashboard",
    title: "You're ready! 🎉",
    description: "Your Dashboard shows deadlines, streak, and quick actions. Start by uploading a file or asking Oracle a question.",
    target: "[data-tour='dashboard']",
    position: "right" as const,
  },
];

interface GuidedTourProps {
  onComplete: () => void;
}

export function GuidedTour({ onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(true);

  const step = TOUR_STEPS[currentStep];

  const recalculate = useCallback(() => {
    const el = document.querySelector(step.target);
    if (el) setRect(el.getBoundingClientRect());
  }, [step.target]);

  useEffect(() => {
    recalculate();
    window.addEventListener("resize", recalculate);
    window.addEventListener("scroll", recalculate, true);
    return () => {
      window.removeEventListener("resize", recalculate);
      window.removeEventListener("scroll", recalculate, true);
    };
  }, [recalculate]);

  const completeTour = useCallback(() => {
    localStorage.setItem("uniflow-tour-completed", "true");
    setVisible(false);
    onComplete();
  }, [onComplete]);

  const skipTour = completeTour;

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) setCurrentStep((prev) => prev + 1);
    else completeTour();
  };

  if (!visible || !rect) return null;

  // Calculate tooltip position
  let tooltipX = rect.right + 16;
  let tooltipY = rect.top;

  // Ensure tooltip doesn't go off-screen right
  if (tooltipX + 288 > window.innerWidth) {
    tooltipX = rect.left - 288 - 16;
  }
  // Ensure tooltip doesn't go off-screen bottom
  if (tooltipY + 250 > window.innerHeight) {
    tooltipY = window.innerHeight - 300;
  }
  // Ensure tooltip doesn't go off-screen top
  if (tooltipY < 16) tooltipY = 16;

  return (
    <>
      {/* Highlight Box — uses box-shadow trick to create overlay */}
      <div
        className="fixed border-2 border-primary rounded-xl pointer-events-none z-[101] transition-all duration-300"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
        }}
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.95, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[102] bg-card border border-border/40 rounded-2xl shadow-2xl p-5 w-72 pointer-events-auto"
          style={{ top: tooltipY, left: tooltipX }}
        >
          {/* Progress dots */}
          <div className="flex gap-1.5 mb-3">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep
                    ? "w-4 bg-primary"
                    : i < currentStep
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted/40"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <h3 className="font-bold text-base mb-1">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={skipTour}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
            <Button
              size="sm"
              onClick={nextStep}
              className="h-8 px-4 text-xs bg-primary hover:bg-primary/90"
            >
              {currentStep === TOUR_STEPS.length - 1 ? "Get started! →" : "Next →"}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
