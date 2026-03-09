import { ComponentType, ReactNode } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  /** Lucide icon component to render inside the avatar */
  Icon?: ComponentType<LucideProps>;
  /** Or pass arbitrary children instead of an Icon */
  children?: ReactNode;
  /** Size class for the container box, e.g. "h-8 w-8" or "h-10 w-10" */
  size?: string;
  /** Tailwind bg/text colour classes for the container */
  colorClass?: string;
  className?: string;
}

/**
 * UserAvatar — rounded icon container used for AI Oracle bot avatar,
 * sidebar user avatar, and any other "icon in a box" pattern.
 */
export function UserAvatar({
  Icon,
  children,
  size = "h-8 w-8",
  colorClass = "bg-primary/10",
  className,
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center shrink-0",
        size,
        colorClass,
        className
      )}
    >
      {Icon ? <Icon className="h-4 w-4 text-primary" /> : children}
    </div>
  );
}
