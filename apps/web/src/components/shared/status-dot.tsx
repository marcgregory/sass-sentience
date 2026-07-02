import { cn } from "@sentience/utils";
import type { DeviceStatus } from "@sentience/types";

interface StatusDotProps {
  status: DeviceStatus;
  className?: string;
  animated?: boolean;
}

export function StatusDot({ status, className, animated = true }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        status === "online" && "bg-emerald-500",
        status === "offline" && "bg-slate-400",
        status === "fault" && "bg-red-500",
        status === "warning" && "bg-amber-500",
        animated && status === "online" && "animate-pulse-dot",
        className,
      )}
    />
  );
}

interface StatusBadgeProps {
  status: DeviceStatus;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, showDot = true, className }: StatusBadgeProps) {
  const labels: Record<DeviceStatus, string> = {
    online: "Online",
    offline: "Offline",
    fault: "Fault",
    warning: "Warning",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "online" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
        status === "offline" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        status === "fault" && "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
        status === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
        className,
      )}
    >
      {showDot && <StatusDot status={status} />}
      {labels[status]}
    </span>
  );
}
