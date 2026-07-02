"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, CheckCircle, Eye } from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";
import { useLiveDeviceStore } from "@/stores/live-device-store";

const MOCK_ALERTS = [
  { id: "ALT-001", title: "Device offline — Gate Controller A3", severity: "critical" as const, status: "open" as const, category: "device_offline", site: "Building A - Riverside", device: "Gate Controller A3", time: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: "ALT-002", title: "Battery low — Sensor B7 (12%)", severity: "warning" as const, status: "acknowledged" as const, category: "battery_low", site: "Building B - Riverside", device: "Sensor B7", time: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: "ALT-003", title: "Signal strength degraded — Gateway 4", severity: "warning" as const, status: "open" as const, category: "signal_weak", site: "Warehouse 1 - Tech Valley", device: "Gateway 4", time: new Date(Date.now() - 32 * 60 * 1000).toISOString() },
  { id: "ALT-004", title: "Firmware update available — 12 devices", severity: "info" as const, status: "open" as const, category: "firmware_outdated", site: "All sites", device: "Multiple", time: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  { id: "ALT-005", title: "Temperature threshold exceeded — Server Room A", severity: "critical" as const, status: "resolved" as const, category: "temperature_high", site: "Admin Block - Tech Valley", device: "Temp Sensor T3", time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
];

const severityStyles: Record<string, string> = {
  critical: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

export default function AlertsPage() {
  const recentEvents = useLiveDeviceStore((s) => s.recentEvents);
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);
  const hasLiveEvents = recentEvents.length > 0;

  // Build live alerts from the event feed
  const liveAlerts = recentEvents
    .filter((e) => e.severity === "critical" || e.severity === "warning" || e.severity === "info")
    .slice(0, 10)
    .map((e) => ({
      id: e.eventId,
      title: e.title,
      severity: e.severity as "critical" | "warning" | "info",
      status: "open" as const,
      category: e.category,
      site: e.siteId ?? "Unknown",
      device: e.deviceId ?? "Unknown",
      time: e.timestamp,
    }));

  const displayAlerts = liveAlerts.length > 0 ? liveAlerts : MOCK_ALERTS;
  const activeAlerts = displayAlerts.filter((a) => a.status !== "resolved");

  // Summary breakdown
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = activeAlerts.filter((a) => a.severity === "warning").length;
  const infoCount = activeAlerts.filter((a) => a.severity === "info").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Alerts"
        description="Monitor and manage system alerts"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">Alert Rules</Button>
          </div>
        }
      />

      {/* Connection indicator */}
      {!isSocketConnected && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
          {hasLiveEvents
            ? "Showing cached alerts — real-time connection is offline."
            : "Real-time connection is offline. Static data shown."}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalCount}</p>
          <p className="text-sm text-muted-foreground">Critical Alerts</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{warningCount}</p>
          <p className="text-sm text-muted-foreground">Warning Alerts</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{infoCount}</p>
          <p className="text-sm text-muted-foreground">Info Alerts</p>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {displayAlerts.length === 0 && !hasLiveEvents && (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-sm text-muted-foreground">No alerts to display.</p>
          </div>
        )}
        {displayAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${severityStyles[alert.severity]}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={alert.severity === "critical" ? "destructive" : alert.severity === "warning" ? "warning" : "default"}>
                    {alert.severity}
                  </Badge>
                  <Badge variant="outline">{alert.status}</Badge>
                  <span className="text-xs text-muted-foreground">{alert.category.replace("_", " ")}</span>
                </div>
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm text-muted-foreground">
                  {alert.site} · {alert.device} · {formatRelativeTime(alert.time)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
