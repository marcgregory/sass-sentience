"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, CheckCircle, Eye } from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";

const alerts = [
  { id: "ALT-001", title: "Device offline — Gate Controller A3", severity: "critical", status: "open", category: "device_offline", site: "Building A - Riverside", device: "Gate Controller A3", time: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: "ALT-002", title: "Battery low — Sensor B7 (12%)", severity: "warning", status: "acknowledged", category: "battery_low", site: "Building B - Riverside", device: "Sensor B7", time: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: "ALT-003", title: "Signal strength degraded — Gateway 4", severity: "warning", status: "open", category: "signal_weak", site: "Warehouse 1 - Tech Valley", device: "Gateway 4", time: new Date(Date.now() - 32 * 60 * 1000).toISOString() },
  { id: "ALT-004", title: "Firmware update available — 12 devices", severity: "info", status: "open", category: "firmware_outdated", site: "All sites", device: "Multiple", time: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  { id: "ALT-005", title: "Temperature threshold exceeded — Server Room A", severity: "critical", status: "resolved", category: "temperature_high", site: "Admin Block - Tech Valley", device: "Temp Sensor T3", time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
];

const severityStyles = {
  critical: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

export default function AlertsPage() {
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

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Critical", count: 2, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Warning", count: 5, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Info", count: 8, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
        ].map((item) => (
          <div key={item.label} className={`rounded-lg border p-4 ${item.bg}`}>
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-sm text-muted-foreground">{item.label} Alerts</p>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${severityStyles[alert.severity as keyof typeof severityStyles]}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={alert.severity as "destructive" | "warning" | "default"}>
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
