"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, AlertTriangle, Info, Monitor, FileText } from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";

const notifications = [
  { id: "NOT-001", title: "Critical alert: Gate Controller A3 offline", message: "Device has been unreachable for 5 minutes", category: "alert", priority: "critical", isRead: false, time: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: "NOT-002", title: "Firmware update available", message: "New firmware v2.4.1 is available for 12 devices", category: "device", priority: "high", isRead: false, time: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: "NOT-003", title: "Weekly report ready", message: "Weekly performance summary is ready for review", category: "report", priority: "normal", isRead: false, time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "NOT-004", title: "System maintenance completed", message: "Scheduled maintenance on MQTT broker completed", category: "system", priority: "low", isRead: true, time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: "NOT-005", title: "New user invited", message: "Frank Miller was invited as installer", category: "user", priority: "normal", isRead: true, time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
];

const categoryIcons = {
  alert: AlertTriangle,
  device: Monitor,
  system: Info,
  report: FileText,
  user: Bell,
  maintenance: Bell,
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-blue-500",
  low: "bg-slate-400",
};

export default function NotificationsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications"
        description="Stay informed about your IoT estate"
        actions={
          <Button variant="outline" size="sm">
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        }
      />

      <div className="space-y-2">
        {notifications.map((n) => {
          const Icon = categoryIcons[n.category as keyof typeof categoryIcons] || Bell;
          return (
            <Card key={n.id} className={`${!n.isRead ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-lg ${
                    !n.isRead ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Icon className={`h-4 w-4 ${!n.isRead ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                      <p className="text-sm font-medium">{n.title}</p>
                      <span className={`ml-auto h-2 w-2 rounded-full ${priorityColors[n.priority]}`} />
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.time)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
