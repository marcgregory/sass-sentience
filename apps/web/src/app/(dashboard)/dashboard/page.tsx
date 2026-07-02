"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import {
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
  Wifi,
  WifiOff,
  AlertTriangle,
  Zap,
  Thermometer,
  Battery,
  Activity,
  Clock,
} from "lucide-react";

// Mock KPI data
const kpis = [
  {
    label: "Total Devices",
    value: "2,847",
    change: "+12",
    trend: "up",
    icon: Monitor,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    label: "Online",
    value: "2,631",
    change: "+8",
    trend: "up",
    icon: Wifi,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    label: "Offline",
    value: "142",
    change: "-3",
    trend: "down",
    icon: WifiOff,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    label: "Faults",
    value: "37",
    change: "+5",
    trend: "up",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  {
    label: "Warnings",
    value: "89",
    change: "-2",
    trend: "down",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
];

const recentAlerts = [
  {
    id: "ALT-001",
    title: "Device offline — Gate Controller A3",
    severity: "critical",
    time: "2 min ago",
    site: "North Gate",
  },
  {
    id: "ALT-002",
    title: "Battery low — Sensor B7 (12%)",
    severity: "warning",
    time: "15 min ago",
    site: "Building B",
  },
  {
    id: "ALT-003",
    title: "Signal strength degraded — Gateway 4",
    severity: "warning",
    time: "32 min ago",
    site: "Warehouse 2",
  },
  {
    id: "ALT-004",
    title: "Firmware update available — 12 devices",
    severity: "info",
    time: "1 hr ago",
    site: "All sites",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your IoT estate"
      />

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <div className={`rounded-lg p-2 ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    kpi.trend === "up"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {kpi.change} this week
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* System Health */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
            <CardDescription>Device status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Online", value: 92.4, color: "bg-emerald-500" },
                { label: "Offline", value: 5.0, color: "bg-slate-400" },
                { label: "Fault", value: 1.3, color: "bg-red-500" },
                { label: "Warning", value: 1.3, color: "bg-amber-500" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="relative mx-auto mb-2 h-20 w-20">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-muted"
                        opacity={0.2}
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${item.value} ${100 - item.value}`}
                        strokeLinecap="round"
                        className={item.color.replace("bg-", "text-")}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                      {item.value}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Recent Alerts
            </CardTitle>
            <CardDescription>Latest issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      alert.severity === "critical"
                        ? "bg-red-500"
                        : alert.severity === "warning"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.site} · {alert.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Battery Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Battery className="h-4 w-4" />
              Battery Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: "Good (>80%)", value: 65, color: "bg-emerald-500" },
                { label: "Fair (40-80%)", value: 22, color: "bg-amber-500" },
                { label: "Low (<40%)", value: 13, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{item.label}</span>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Signal Strength */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4" />
              Signal Strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: "Excellent (< -50 dBm)", value: 45, color: "bg-emerald-500" },
                { label: "Good (-50 to -70 dBm)", value: 30, color: "bg-blue-500" },
                { label: "Fair (-70 to -85 dBm)", value: 15, color: "bg-amber-500" },
                { label: "Poor (> -85 dBm)", value: 10, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{item.label}</span>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Today's Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Events Today", value: "1,247", icon: Activity },
                { label: "Avg Response Time", value: "2.3s", icon: Clock },
                { label: "Temperature Range", value: "18°C - 32°C", icon: Thermometer },
                { label: "System Uptime", value: "99.97%", icon: Zap },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {stat.label}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
