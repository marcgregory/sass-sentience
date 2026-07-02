"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@sentience/utils";
import { Filter, Download } from "lucide-react";

const auditLogs = [
  { id: "AUD-001", user: "Alice Johnson", action: "login", resource: "Session", description: "User logged in", time: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
  { id: "AUD-002", user: "Bob Smith", action: "update", resource: "Device", description: "Updated device config: Gateway 4", time: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
  { id: "AUD-003", user: "Carol Davis", action: "create", resource: "Site", description: "Created new site: Warehouse 3", time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { id: "AUD-004", user: "System", action: "delete", resource: "Alert", description: "Auto-resolved 3 stale alerts", time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "AUD-005", user: "Alice Johnson", action: "export", resource: "Report", description: "Exported monthly fleet report", time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
];

export default function AuditLogPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Log"
        description="Track all system activity and changes"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border">
        <div className="divide-y">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {log.user.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium">{log.user}</p>
                  <Badge variant="outline" className="text-xs capitalize">{log.action}</Badge>
                  <Badge variant="outline" className="text-xs">{log.resource}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{log.description}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(log.time)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
