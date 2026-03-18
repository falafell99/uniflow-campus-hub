import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Sparkles, X, RotateCcw, Loader2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudyCoachProps {
  page: "dashboard" | "notes" | "vault" | "tasks";
  currentSubject?: string;
  onTriggerStudyMode?: () => void;
}

interface CacheData {
  content: string;
  fetchedAt: number;
}

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_MODEL = "llama-3.3-70b-versatile";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ─── Component ────────────────────────────────────────────────────────────────
export function StudyCoach({ page, currentSubject, onTriggerStudyMode }: StudyCoachProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [coachResponse, setCoachResponse] = useState<string>("");
  const [cache, setCache] = useState<Record<string, CacheData>>({});
  const hasFetched = useRef(false);

  const fetchCoachData = useCallback(async (force = false) => {
    if (!user || !API_KEY) return;
    
    const now = Date.now();
    if (!force && cache[page] && now - cache[page].fetchedAt < CACHE_TTL) {
      setCoachResponse(cache[page].content);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch parallel data
      const [deadlinesRes, filesRes, tasksCountRes] = await Promise.all([
        supabase.from("campus_events")
          .select("title, start_time")
          .eq("user_id", user.id)
          .eq("event_type", "deadline")
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(3),
        supabase.from("vault_files")
          .select("name, created_at")
          .eq("uploader_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "todo")
      ]);

      const deadlinesList = deadlinesRes.data?.map(d => d.title).join(", ") || "none";
      const filesList = filesRes.data?.map(f => f.name).join(", ") || "none";
      const tasksCount = tasksCountRes.count || 0;
      const filesCount = filesRes.data?.length || 0;

      // 2. Prepare AI Prompt
      let userPrompt = "";
      if (page === "dashboard") {
        userPrompt = `Student data: upcoming deadlines: ${deadlinesList}, recent uploads: ${filesList}, pending tasks: ${tasksCount}. What should they focus on today?`;
      } else if (page === "notes") {
        userPrompt = `Student is currently studying: ${currentSubject || 'general subject'}. Upcoming deadlines: ${deadlinesList}. Give study tips for right now.`;
      } else if (page === "vault") {
        userPrompt = `Student has these upcoming deadlines: ${deadlinesList} and ${filesCount} files uploaded. Suggest how to use their materials effectively.`;
      } else if (page === "tasks") {
        userPrompt = `Student has ${tasksCount} pending tasks. Upcoming deadlines: ${deadlinesList}. Help them prioritize.`;
      }

      // 3. Groq API Call
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: "You are a proactive, encouraging study coach for a university student. Give 2-3 short, specific, actionable suggestions based on their current data. Be warm and motivating. Keep total response under 80 words. Use simple bullet points starting with an emoji." },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
        }),
      });

      const aiData = await res.json();
      const content = aiData.choices?.[0]?.message?.content || "Keep up the great work! You're on the right track.";
      
      setCoachResponse(content);
      setCache(prev => ({ ...prev, [page]: { content, fetchedAt: now } }));
    } catch (err) {
      console.error("Coach error:", err);
      // Fallback silently
    } finally {
      setIsLoading(false);
    }
  }, [user, page, currentSubject, cache]);

  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      fetchCoachData();
      hasFetched.current = true;
    }
  }, [isOpen, fetchCoachData]);

  const refresh = () => {
    fetchCoachData(true);
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold shadow-lg hover:bg-primary/90 active:scale-95 transition-all outline-none ring-offset-2 ring-primary/20 focus-visible:ring-2"
      >
        <Brain className="h-4 w-4" />
        Study Coach
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 w-80 z-50 bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden glass-card"
            style={{ maxHeight: '420px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-muted/5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Study Coach</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={refresh}>
                  <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto custom-scroll" style={{ maxHeight: '340px' }}>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground animate-pulse">Consulting the oracle...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    {coachResponse.split('\n').filter(line => line.trim()).map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5 group">
                        <span className="text-lg leading-none mt-0.5 shrink-0 transform group-hover:scale-110 transition-transform">{line.trim()[0]}</span>
                        <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                          {line.trim().slice(1).trim()}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-border/10 flex items-center justify-between">
                    {page === "dashboard" && (
                      <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1.5 px-2 bg-primary/5 border-primary/20 hover:bg-primary/10" onClick={() => navigate("/ai-oracle")}>
                        Ask Oracle <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                    {page === "notes" && (
                      <Button size="sm" variant="default" className="text-[10px] h-7 gap-1.5 px-3" onClick={onTriggerStudyMode}>
                        <Brain className="h-3 w-3" /> Start Quiz
                      </Button>
                    )}
                    {page === "vault" && (
                      <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1.5 px-2 bg-primary/5 border-primary/20 hover:bg-primary/10" onClick={() => navigate("/ai-oracle")}>
                        Generate Study Plan <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                    {page === "tasks" && (
                      <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1.5 px-2 bg-primary/5 border-primary/20 hover:bg-primary/10" onClick={() => navigate("/tasks")}>
                        View My Tasks <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
