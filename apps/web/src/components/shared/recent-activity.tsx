"use client";

import { AlertTriangle, Info, XCircle } from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";
import { cn } from "@sentience/utils";
import type { LiveEventEntry } from "@/stores/live-device-store";

interface RecentActivityProps {
  events: LiveEventEntry[];
  className?: string;
}

const severityConfig = {
  critical: { icon: XCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
} as const;

/**
 * Recent Activity feed — renders the latest events from the live store
 * ring buffer, auto-updating as new events arrive.
 */
export function RecentActivity({ events, className }: RecentActivityProps) {
  if (events.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="py-8 text-center text-sm text-muted-foreground">
          No recent events. Start the simulator to see live activity.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {events.map((event) => {
        const sev = (event.severity ?? "info") as keyof typeof severityConfig;
        const cfg = severityConfig[sev] ?? severityConfig.info;
        const Icon = cfg.icon;

        return (
          <div
            key={event.eventId}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
              cfg.bg,
            )}
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.color)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {event.deviceName && <span className="font-semibold">{event.deviceName}</span>}
                {!event.deviceName && event.title}
              </p>
              {event.deviceName && (
                <p className="text-xs text-muted-foreground truncate">{event.title}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {event.siteName ?? event.siteId ?? "Unknown"}
                {event.category && ` · ${event.category}`}
                {" · "}
                {formatRelativeTime(event.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
