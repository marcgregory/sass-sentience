"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@sentience/utils";
import { Download, Filter, Calendar } from "lucide-react";
import type { EventSeverity } from "@sentience/types";

const events = [
  { id: "EVT-001", title: "Device came online", severity: "info", category: "device_online", device: "Gate Controller A3", user: "System", time: new Date(Date.now() - 1 * 60 * 1000).toISOString() },
  { id: "EVT-002", title: "Heartbeat received", severity: "info", category: "heartbeat", device: "Sensor B7", user: "System", time: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: "EVT-003", title: "Battery dropped below 20%", severity: "warning", category: "telemetry", device: "Sensor B7", user: "System", time: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: "EVT-004", title: "Device went offline", severity: "error", category: "device_offline", device: "Access Controller A1", user: "System", time: new Date(Date.now() - 42 * 60 * 1000).toISOString() },
  { id: "EVT-005", title: "Configuration change applied", severity: "info", category: "config_change", device: "Gateway 4", user: "John Smith (Installer)", time: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  { id: "EVT-006", title: "Firmware update initiated", severity: "info", category: "firmware_update", device: "Camera NW-12", user: "System", time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "EVT-007", title: "Temperature critical threshold reached", severity: "critical", category: "telemetry", device: "Temp Sensor T3", user: "System", time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
];

const severityBadge: Record<EventSeverity, "default" | "destructive" | "warning" | "outline"> = {
  info: "default",
  warning: "warning",
  error: "destructive",
  critical: "destructive",
};

export default function EventsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Event History"
        description="Complete audit trail of all device and system events"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4" />
              Date Range
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      {/* Event timeline */}
      <div className="rounded-lg border">
        <div className="divide-y">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                event.severity === "critical" ? "bg-red-500" :
                event.severity === "error" ? "bg-red-400" :
                event.severity === "warning" ? "bg-amber-500" :
                "bg-blue-500"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium">{event.title}</p>
                  <Badge variant={severityBadge[event.severity as EventSeverity]} className="capitalize">
                    {event.severity}
                  </Badge>
                  <Badge variant="outline" className="capitalize">{event.category.replace("_", " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {event.device} · {event.user} · {formatRelativeTime(event.time)}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{event.id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing 1-7 of 1,247 events</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}
