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
import { Stethoscope, Play, CheckCircle2, XCircle, AlertCircle, Monitor } from "lucide-react";

const recentDiagnostics = [
  { id: "DG-001", device: "Gate Controller A3", type: "Ping", status: "passed", time: "5 min ago", ranBy: "System" },
  { id: "DG-002", device: "Gateway 4", type: "Connection", status: "passed", time: "15 min ago", ranBy: "Installer: John" },
  { id: "DG-003", device: "Sensor B7", type: "MQTT", status: "passed", time: "22 min ago", ranBy: "System" },
  { id: "DG-004", device: "Access Controller A1", type: "Ping", status: "failed", time: "1 hr ago", ranBy: "Support: Sarah" },
  { id: "DG-005", device: "Camera NW-12", type: "Signal", status: "warning", time: "2 hr ago", ranBy: "System" },
];

export default function DiagnosticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Device Diagnostics"
        description="Run and review device diagnostics across your estate"
        actions={
          <Button>
            <Play className="h-4 w-4" />
            Run Diagnostic
          </Button>
        }
      />

      {/* Diagnostic tools grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { name: "Ping Test", desc: "ICMP connectivity check", icon: Monitor },
          { name: "Connection Test", desc: "End-to-end connection verification", icon: Monitor },
          { name: "MQTT Status", desc: "MQTT broker connection status", icon: Monitor },
          { name: "Signal Test", desc: "Wireless signal strength analysis", icon: Monitor },
          { name: "Battery Test", desc: "Battery health and charge cycle", icon: Monitor },
          { name: "Firmware Check", desc: "Current vs latest firmware version", icon: Monitor },
        ].map((tool) => (
          <Card key={tool.name} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <tool.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">{tool.name}</CardTitle>
                  <CardDescription>{tool.desc}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Recent diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Recent Diagnostics
          </CardTitle>
          <CardDescription>Latest diagnostic results across all devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {recentDiagnostics.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {d.status === "passed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : d.status === "failed" ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{d.device}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.type} · Ran by {d.ranBy} · {d.time}
                    </p>
                  </div>
                </div>
                <Badge variant={d.status === "passed" ? "online" : d.status === "failed" ? "fault" : "warning"}>
                  {d.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
