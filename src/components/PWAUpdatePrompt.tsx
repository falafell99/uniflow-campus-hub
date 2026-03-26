import { X, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every hour
      r && setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-sm"
    >
      <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
        <RefreshCw className="h-4 w-4 shrink-0" />
        <p className="text-sm flex-1 font-medium">New version available!</p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          Update
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="opacity-60 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
