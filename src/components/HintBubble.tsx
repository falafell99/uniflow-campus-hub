import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HintBubbleProps {
  id: string;
  message: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function HintBubble({ id, message, position = "bottom", className }: HintBubbleProps) {
  const key = `hint-${id}`;
  const [visible, setVisible] = useState(() => localStorage.getItem(key) !== "true");

  const dismiss = () => {
    localStorage.setItem(key, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const arrowClass =
    position === "bottom" ? "-top-1 left-4" :
    position === "top" ? "-bottom-1 left-4" :
    position === "right" ? "top-2 -left-1" :
    "top-2 -right-1";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`absolute z-50 bg-primary text-primary-foreground text-xs rounded-xl px-3 py-2 shadow-lg max-w-[200px] leading-relaxed ${className}`}
      >
        {/* Arrow */}
        <div className={`absolute w-2 h-2 bg-primary rotate-45 ${arrowClass}`} />
        <div className="flex items-start gap-2">
          <span className="flex-1">{message}</span>
          <button onClick={dismiss} className="opacity-60 hover:opacity-100 shrink-0 mt-0.5">✕</button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
