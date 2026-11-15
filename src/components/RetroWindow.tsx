import { ReactNode } from "react";

interface RetroWindowProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Extra controls rendered before the decorative window buttons */
  actions?: ReactNode;
  /** Hide the decorative minimize/maximize/close buttons */
  noButtons?: boolean;
}

export function RetroWindow({ title, icon, children, className = "", bodyClassName = "", actions, noButtons }: RetroWindowProps) {
  return (
    <div className={`retro-window flex flex-col min-h-0 ${className}`}>
      <div className="retro-titlebar flex items-center gap-1.5 px-1.5 py-[3px] select-none shrink-0">
        {icon}
        <span className="font-pixel text-[11px] font-bold tracking-wide truncate">{title}</span>
        <span className="ml-auto flex items-center gap-[3px] shrink-0">
          {actions}
          {!noButtons && (
            <>
              <span className="retro-btn w-[18px] h-[16px] flex items-end justify-center text-[10px] font-black leading-[10px] pb-[1px]">_</span>
              <span className="retro-btn w-[18px] h-[16px] flex items-center justify-center text-[9px] font-black leading-none">□</span>
              <span className="retro-btn w-[18px] h-[16px] flex items-center justify-center text-[10px] font-black leading-none">✕</span>
            </>
          )}
        </span>
      </div>
      <div className={`retro-window-body m-[3px] mt-0 flex-1 min-h-0 overflow-auto custom-scroll ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
