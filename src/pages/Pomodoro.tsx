import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Coffee, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";

type Preset = { label: string; focus: number; break_: number; icon: React.ReactNode };

const presets: Preset[] = [
  { label: "Focus", focus: 25 * 60, break_: 5 * 60, icon: <Zap className="h-3.5 w-3.5" /> },
  { label: "Deep Work", focus: 50 * 60, break_: 10 * 60, icon: <Coffee className="h-3.5 w-3.5" /> },
];

export default function Pomodoro() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(presets[0].focus);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const { setCurrentStatus } = useApp();
  const intervalRef = useRef<number | null>(null);

  const totalTime = isBreak ? presets[presetIdx].break_ : presets[presetIdx].focus;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("start") === "true") {
      setIsRunning(true);
      if (!isBreak) setCurrentStatus("🔴 Focusing");
      window.history.replaceState({}, '', '/pomodoro');
    }
  }, [setCurrentStatus, isBreak]);

  const playChime = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch { /* AudioContext not available in this environment */ }
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playChime();
      if (!isBreak) {
        setSessions((s) => s + 1);
        setIsBreak(true);
        setTimeLeft(presets[presetIdx].break_);
        setCurrentStatus("☕ Taking a break");
        toast({ title: "Focus session complete!", description: "Great work! Time for a break." });
      } else {
        setIsBreak(false);
        setTimeLeft(presets[presetIdx].focus);
        setCurrentStatus("🟢 Online");
        toast({ title: "Break over!", description: "Ready for another focus session?" });
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft, isBreak, presetIdx, playChime, setCurrentStatus]);

  const reset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(presets[presetIdx].focus);
    setCurrentStatus("🟢 Online");
  };

  const switchPreset = (idx: number) => {
    setPresetIdx(idx);
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(presets[idx].focus);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center h-[calc(100vh-5rem)] gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">⏱ Pomodoro Timer</h1>
        <p className="text-muted-foreground mt-1">
          {isBreak ? "Break time — relax" : "Stay focused, stay sharp"}
        </p>
      </div>

      {/* Preset selector */}
      <div className="flex gap-2">
        {presets.map((p, i) => (
          <Button
            key={p.label}
            variant={presetIdx === i ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => switchPreset(i)}
          >
            {p.icon} {p.label} ({p.focus / 60}/{p.break_ / 60})
          </Button>
        ))}
      </div>

      {/* Circular timer */}
      <div className="relative">
        <svg width="280" height="280" className="transform -rotate-90">
          <circle
            cx="140" cy="140" r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="6"
          />
          <circle
            cx="140" cy="140" r={radius}
            fill="none"
            stroke={isBreak ? "hsl(var(--success))" : "hsl(var(--primary))"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tracking-tight tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <Badge variant="outline" className={`mt-2 text-[10px] ${isBreak ? "border-success/30 text-success" : "border-primary/30 text-primary"}`}>
            {isBreak ? "BREAK" : "FOCUS"}
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          className="gap-2 px-8"
          onClick={() => {
            setIsRunning(!isRunning);
            if (!isRunning && !isBreak) setCurrentStatus("🔴 Focusing");
          }}
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? "Pause" : "Start"}
        </Button>
        <Button variant="outline" size="lg" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Sessions completed today: <span className="font-semibold text-foreground">{sessions}</span>
      </p>
    </div>
  );
}
