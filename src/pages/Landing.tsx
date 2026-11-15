import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

/* Pixel icons: hand-drawn 16x16, crisp edges. */
const PX = {
  notes: (
    <>
      <rect x="3" y="1" width="9" height="14" fill="#fff" stroke="#000" />
      <rect x="9" y="1" width="3" height="3" fill="#dfdfdf" stroke="#000" />
      <rect x="5" y="4" width="5" height="1" fill="#1084d0" /><rect x="5" y="6" width="5" height="1" fill="#1084d0" />
      <rect x="5" y="8" width="5" height="1" fill="#1084d0" /><rect x="5" y="10" width="3" height="1" fill="#1084d0" />
    </>
  ),
  cards: (
    <>
      <rect x="4" y="2" width="8" height="11" fill="#dfdfdf" stroke="#000" />
      <rect x="2" y="4" width="8" height="11" fill="#fff" stroke="#000" />
      <rect x="4" y="7" width="4" height="1" fill="#c00000" /><rect x="4" y="9" width="4" height="1" fill="#000" />
      <rect x="4" y="11" width="3" height="1" fill="#000" />
    </>
  ),
  kanban: (
    <>
      <rect x="1" y="2" width="14" height="12" fill="#fff" stroke="#000" />
      <rect x="2" y="4" width="3" height="8" fill="#ffd27f" stroke="#000" strokeWidth="0.5" />
      <rect x="6.5" y="4" width="3" height="8" fill="#a8d8ff" stroke="#000" strokeWidth="0.5" />
      <rect x="11" y="4" width="3" height="8" fill="#b5e6b5" stroke="#000" strokeWidth="0.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#000" />
      <rect x="2" y="2" width="12" height="3" fill="#c00000" />
      <rect x="4" y="7" width="2" height="2" fill="#1084d0" /><rect x="7" y="7" width="2" height="2" fill="#dfdfdf" />
      <rect x="10" y="7" width="2" height="2" fill="#dfdfdf" /><rect x="4" y="10" width="2" height="2" fill="#dfdfdf" />
      <rect x="7" y="10" width="2" height="2" fill="#dfdfdf" /><rect x="10" y="10" width="2" height="2" fill="#dfdfdf" />
    </>
  ),
  vault: (
    <>
      <rect x="3" y="2" width="10" height="12" fill="#7f1f1f" stroke="#000" />
      <rect x="5" y="2" width="8" height="12" fill="#a83232" stroke="#000" />
      <rect x="7" y="5" width="4" height="3" fill="#ffd27f" stroke="#000" strokeWidth="0.5" />
      <rect x="3" y="12" width="10" height="2" fill="#fff" stroke="#000" strokeWidth="0.5" />
    </>
  ),
  oracle: (
    <>
      <rect x="2" y="3" width="12" height="9" fill="#fff" stroke="#000" />
      <rect x="5" y="12" width="6" height="2" fill="#dfdfdf" stroke="#000" />
      <rect x="7" y="5" width="2" height="2" fill="#ffd700" /><rect x="6" y="6" width="4" height="1" fill="#ffd700" />
      <rect x="6" y="7" width="4" height="1" fill="#ffd700" /><rect x="7" y="8" width="2" height="1" fill="#ffd700" />
    </>
  ),
  teams: (
    <>
      <rect x="3" y="3" width="4" height="4" fill="#1084d0" /><rect x="2" y="8" width="6" height="6" fill="#1084d0" />
      <rect x="10" y="3" width="4" height="4" fill="#7fbbe8" /><rect x="9" y="8" width="6" height="6" fill="#7fbbe8" />
    </>
  ),
  progress: (
    <>
      <rect x="2" y="8" width="3" height="6" fill="#3aa655" stroke="#000" strokeWidth="0.5" />
      <rect x="6" y="5" width="3" height="9" fill="#3aa655" stroke="#000" strokeWidth="0.5" />
      <rect x="10" y="2" width="3" height="12" fill="#3aa655" stroke="#000" strokeWidth="0.5" />
    </>
  ),
  messages: (
    <>
      <rect x="2" y="3" width="12" height="8" fill="#fff" stroke="#000" />
      <rect x="4" y="11" width="3" height="3" fill="#fff" stroke="#000" />
      <rect x="4" y="5" width="8" height="1" fill="#1084d0" /><rect x="4" y="7" width="6" height="1" fill="#1084d0" />
    </>
  ),
} as const;

type PxId = keyof typeof PX;

function PxIcon({ id, size = 36 }: { id: PxId; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      {PX[id]}
    </svg>
  );
}

interface Tool {
  id: string;
  name: string;
  desc: string;
  icon: PxId;
}

const TOOLS: Tool[] = [
  { id: "notes", name: "Notes", desc: "Notion-style notes with Study Mode — quiz yourself on your own notes with AI.", icon: "notes" },
  { id: "flashcards", name: "Flashcards", desc: "Spaced repetition flashcards. Generate them from any PDF or note in one click.", icon: "cards" },
  { id: "kanban", name: "Kanban Tasks", desc: "Manage your assignments with drag-and-drop boards. Syncs with your Calendar.", icon: "kanban" },
  { id: "calendar", name: "Calendar", desc: "Track exams and deadlines. Get smart reminders 7 days, 3 days, and 1 day before.", icon: "calendar" },
  { id: "vault", name: "Smart Vault", desc: "Upload lectures and PDFs. AI generates summaries and flashcards automatically.", icon: "vault" },
  { id: "oracle", name: "AI Oracle", desc: "Ask anything. Get expert explanations with LaTeX support, PDF analysis, and study plans.", icon: "oracle" },
  { id: "teams", name: "Teams", desc: "Collaborate on group projects with shared tasks, whiteboards, and activity feeds.", icon: "teams" },
  { id: "progress", name: "Progress", desc: "Track your study streak, weekly activity heatmap, and subject breakdown.", icon: "progress" },
  { id: "messages", name: "Messages", desc: "Direct messages with @mentions. Stay connected with your study group.", icon: "messages" },
];

const WELCOME = "welcome";

export default function Landing() {
  const navigate = useNavigate();
  const [activeWin, setActiveWin] = useState<string | null>(WELCOME);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    document.title = "UniFlow | Student Collaboration Ecosystem";
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const clock = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const activeTool = TOOLS.find((t) => t.id === activeWin) ?? null;
  const winTitle = activeWin === WELCOME ? "UniFlow — Welcome" : activeTool ? `${activeTool.name} — UniFlow` : "";
  const winIcon: PxId = activeWin === WELCOME ? "notes" : activeTool?.icon ?? "notes";

  const openWindow = (id: string) => {
    setActiveWin(id);
    setMinimized(false);
    setMaximized(false);
    setSelectedIcon(id === WELCOME ? null : id);
    setStartOpen(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#3a7e7c] flex flex-col font-sans text-black select-none">
      {/* Desktop area */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row relative">
        {/* Icons */}
        <div className="flex-1 md:flex-none grid grid-cols-3 md:grid-cols-2 md:w-[184px] gap-x-1 gap-y-5 content-evenly md:content-start justify-items-center px-2 pt-4 md:pt-5 pb-2 min-h-0">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => openWindow(t.id)}
              className="flex flex-col items-center gap-1.5 w-[84px] group"
              aria-label={`Open ${t.name}`}
            >
              <span className="drop-shadow-[1px_2px_0_rgba(0,0,0,0.35)]">
                <PxIcon id={t.icon} />
              </span>
              <span
                className={`font-pixel text-[9px] leading-[1.35] text-white text-center px-1 py-[1px] [text-shadow:1px_1px_0_rgba(0,0,0,0.55)] ${
                  selectedIcon === t.id ? "bg-[#000080]" : ""
                }`}
              >
                {t.name}
              </span>
            </button>
          ))}
        </div>

        {/* Window area */}
        <div className="shrink-0 md:flex-1 min-h-0 flex items-end md:items-center justify-center p-3 md:p-6">
          {activeWin !== null && !minimized && (
            <div
              className={`retro-bevel-out p-[3px] flex flex-col min-h-0 ${
                maximized ? "w-full h-full" : "w-full max-w-[560px] max-h-full"
              }`}
              role="dialog"
              aria-label={winTitle}
            >
              {/* Title bar */}
              <div className="flex items-center gap-2 px-1.5 py-[3px] pl-2 bg-gradient-to-r from-[#000080] to-[#1084d0] shrink-0">
                <PxIcon id={winIcon} size={14} />
                <span className="font-pixel font-bold text-[10px] text-white truncate">{winTitle}</span>
                <div className="ml-auto flex gap-[2px] shrink-0">
                  <button
                    onClick={() => setMinimized(true)}
                    aria-label="Minimize window"
                    className="retro-btn w-[18px] h-[16px] font-pixel text-[8px] leading-[14px] text-center"
                  >
                    _
                  </button>
                  <button
                    onClick={() => setMaximized((m) => !m)}
                    aria-label={maximized ? "Restore window" : "Maximize window"}
                    className="retro-btn w-[18px] h-[16px] font-pixel text-[8px] leading-[14px] text-center"
                  >
                    {maximized ? "❒" : "□"}
                  </button>
                  <button
                    onClick={() => { setActiveWin(null); setMaximized(false); }}
                    aria-label="Close window"
                    className="retro-btn w-[18px] h-[16px] font-pixel text-[8px] leading-[14px] text-center"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="retro-bevel-in m-[3px] p-5 md:p-6 overflow-y-auto min-h-0 custom-scroll">
                {activeWin === WELCOME ? (
                  <>
                    <h1 className="text-[20px] md:text-[22px] font-bold tracking-[-0.01em]">
                      The student operating system.
                    </h1>
                    <p className="mt-3 text-[12.5px] leading-[1.65] text-[#222] max-w-[46ch]">
                      Notes, flashcards, kanban, calendar, a document vault, an AI tutor, teams and messages — in one place, free forever.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate("/login?mode=signup")}
                        className="retro-btn px-5 py-[6px] text-[12px] font-bold outline outline-1 -outline-offset-4 outline-black"
                      >
                        Create an account
                      </button>
                      <button
                        onClick={() => navigate("/login")}
                        className="retro-btn px-5 py-[6px] text-[12px]"
                      >
                        Sign in
                      </button>
                    </div>
                  </>
                ) : activeTool ? (
                  <>
                    <div className="flex items-center gap-3">
                      <PxIcon id={activeTool.icon} size={32} />
                      <h1 className="text-[16px] font-bold">{activeTool.name}</h1>
                    </div>
                    <p className="mt-4 text-[12.5px] leading-[1.65] text-[#222] max-w-[48ch]">{activeTool.desc}</p>
                  </>
                ) : null}
              </div>

              {/* Status bar */}
              <div className="retro-bevel-thin-in mx-[3px] mb-[3px] px-2 py-[3px] flex text-[11px] shrink-0">
                <span>{activeWin === WELCOME ? "9 tools, one place" : activeTool?.name}</span>
                <span className="ml-auto">Ready</span>
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block absolute right-3 top-3 text-right font-pixel text-[9px] leading-[1.7] text-white/75 [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">
          UniFlow OS<br />student edition
        </div>
      </div>

      {/* Start menu */}
      {startOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setStartOpen(false)} />
          <div className="retro-bevel-out absolute left-1 bottom-[36px] z-20 w-[220px] p-[3px]">
            <div className="bg-gradient-to-b from-[#000080] to-[#1084d0] px-2 py-1.5 font-pixel font-bold text-[10px] text-white">
              UniFlow
            </div>
            <button
              onClick={() => navigate("/login?mode=signup")}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#000080] hover:text-white"
            >
              Create an account
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#000080] hover:text-white"
            >
              Sign in
            </button>
            <div className="mx-1 my-1 border-t border-[#868a8e] border-b border-b-white" />
            <button
              onClick={() => openWindow(WELCOME)}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#000080] hover:text-white"
            >
              UniFlow Welcome
            </button>
          </div>
        </>
      )}

      {/* Taskbar */}
      <div className="retro-face shrink-0 h-[34px] flex items-center gap-1.5 px-1.5 shadow-[inset_0_1px_#ffffff,inset_0_2px_#dfdfdf] relative z-30">
        <button
          onClick={() => setStartOpen((o) => !o)}
          className={`retro-btn ${startOpen ? "retro-btn-pressed" : ""} flex items-center gap-1.5 pl-1.5 pr-3 py-[3px]`}
          aria-label="Start menu"
          aria-expanded={startOpen}
        >
          <span className="w-[18px] h-[18px] bg-[#1084d0] text-white text-[10px] font-bold flex items-center justify-center">U</span>
          <span className="font-pixel font-bold text-[10px]">Start</span>
        </button>

        {activeWin !== null && (
          <button
            onClick={() => setMinimized((m) => !m)}
            className={`retro-btn ${minimized ? "" : "retro-btn-pressed"} flex items-center gap-2 px-2 sm:px-3 py-[3px] min-w-0 sm:min-w-[140px] max-w-[160px] sm:max-w-[220px]`}
            aria-label={minimized ? `Restore ${winTitle}` : `Minimize ${winTitle}`}
          >
            <PxIcon id={winIcon} size={12} />
            <span className="text-[11px] truncate">{winTitle}</span>
          </button>
        )}

        <div className="retro-bevel-thin-in ml-auto px-2.5 py-[4px] text-[11px] whitespace-nowrap">
          <span className="hidden sm:inline">Built for students, by students&nbsp;&nbsp;</span>{clock}
        </div>
      </div>
    </div>
  );
}
