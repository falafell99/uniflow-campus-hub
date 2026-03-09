// ─── Enterprise Design Tokens ─────────────────────────────────────────────────
// Single source of truth for all colour constants, badge variants, and gradients.
// import these instead of repeating raw strings in components.

// Raw colour values (for use outside Tailwind context, e.g. inline styles)
export const COLORS = {
  ENTERPRISE_DARK: "#030303",
  PRIMARY: "hsl(217 91% 60%)",
  SUCCESS: "hsl(142 76% 36%)",
  WARNING: "hsl(38 92% 50%)",
  DESTRUCTIVE: "hsl(0 84% 60%)",
  INFO: "hsl(199 89% 48%)",
  FOREGROUND: "hsl(222 47% 11%)",
  BACKGROUND: "hsl(210 20% 97%)",
  BACKGROUND_DARK: "#030303",
} as const;

// Badge tag-class slugs → Tailwind class strings (maps to index.css `.badge-*`)
export const BADGE_CLASSES = {
  golden: "badge-golden",
  exam: "badge-exam",
  slides: "badge-slides",
} as const;
export type BadgeVariant = keyof typeof BADGE_CLASSES;

// Badge slug → display label + class (used in Vault and Dashboard)
export const BADGE_CONFIG: Record<string, { tag: string; tagClass: string }> = {
  "student-notes": { tag: "Student Notes", tagClass: BADGE_CLASSES.golden },
  "exam-prep": { tag: "Exam Prep", tagClass: BADGE_CLASSES.exam },
  "lecture-slides": { tag: "Lecture Slides", tagClass: BADGE_CLASSES.slides },
};

// Pre-built Tailwind gradient strings used across views
export const GRADIENTS = {
  primarySubtle: "from-primary/5 to-transparent",
  glassOverlay: "from-card/80 to-card/40",
} as const;
