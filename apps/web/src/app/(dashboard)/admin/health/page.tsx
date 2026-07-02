"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/components/shared/require-permission";
import {
  Activity,
  Wifi,
  Server,
  Cpu,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Clock,
  Radio,
  BarChart3,
} from "lucide-react";
import type { PlatformService, ServiceStatus } from "@sentience/types";
import { useApiHealth } from "@/hooks/use-api-health";

const statusConfig: Record<ServiceStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  healthy: { label: "Healthy", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/50", icon: CheckCircle2 },
  degraded: { label: "Degraded", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/50", icon: AlertTriangle },
  down: { label: "Down", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/50", icon: XCircle },
  connecting: { label: "Connecting", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/50", icon: Loader2 },
  disconnected: { label: "Disconnected", color: "text-slate-500 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800", icon: XCircle },
};

const initialServices: PlatformService[] = [
  {
    id: "bridge",
    name: "Realtime Bridge",
    status: "healthy",
    description: "Socket.IO gateway connecting MQTT events to the web application",
    uptime: 345600, // 4 days
    lastCheck: new Date().toISOString(),
    metrics: [
      { label: "Events/sec", value: "24" },
      { label: "Connected Clients", value: "3" },
      { label: "Queue Depth", value: "0" },
    ],
  },
  {
    id: "mqtt",
    name: "MQTT Broker",
    status: "healthy",
    description: "Mosquitto message broker for device telemetry",
    uptime: 518400, // 6 days
    lastCheck: new Date().toISOString(),
    metrics: [
      { label: "Connected Devices", value: "47" },
      { label: "Messages/sec", value: "156" },
      { label: "Subscriptions", value: "12" },
    ],
  },
  {
    id: "simulator",
    name: "Device Simulator",
    status: "degraded",
    description: "Faker-based device telemetry simulator for development and testing",
    uptime: 86400, // 1 day
    lastCheck: new Date().toISOString(),
    metrics: [
      { label: "Simulated Devices", value: "50" },
      { label: "Publish Rate", value: "1/s" },
      { label: "Last Published", value: "2s ago" },
    ],
  },
  {
    id: "database",
    name: "Database",
    status: "healthy",
    description: "PostgreSQL 16 — primary data store",
    uptime: 604800, // 7 days
    lastCheck: new Date().toISOString(),
    metrics: [
      { label: "Connection Pool", value: "12/25" },
      { label: "Storage Used", value: "2.3 GB" },
      { label: "Query Latency", value: "4ms" },
    ],
  },
  {
    id: "api",
    name: "API Service",
    status: "healthy" as ServiceStatus,
    description: "REST API — Fastify 5 + Drizzle ORM + PostgreSQL",
    uptime: 0,
    lastCheck: new Date().toISOString(),
    metrics: [
      { label: "Uptime", value: "N/A" },
      { label: "Requests", value: "0" },
      { label: "Status", value: "Online" },
    ],
  },
];

function formatUptime(seconds: number): string {
  if (seconds === 0) return "N/A";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "<1m";
}

export default function PlatformHealthPage() {
  const [services, setServices] = useState<PlatformService[]>(initialServices);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Poll the real API health endpoint
  const { data: apiHealth, isFetching: apiHealthFetching, refetch: refetchApiHealth } = useApiHealth();

  // Derive the API service status from real health data
  const apiServiceStatus: ServiceStatus = !apiHealth
    ? "disconnected"
    : apiHealth.db.status === "unhealthy"
      ? "degraded"
      : "healthy";

  // Merge real API health data into the services list
  useEffect(() => {
    if (!apiHealth) return;
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== "api") return s;
        const uptimeSeconds = Math.max(0, Math.floor(apiHealth.uptime));
        return {
          ...s,
          status: apiServiceStatus,
          uptime: uptimeSeconds,
          lastCheck: apiHealth.timestamp,
          metrics: [
            { label: "Uptime", value: uptimeSeconds > 0 ? `${uptimeSeconds}s` : "N/A" },
            { label: "DB Latency", value: apiHealth.db.latency ?? "N/A" },
            { label: "Status", value: apiHealth.status === "ok" ? "Online" : "Error" },
          ],
        };
      }),
    );
    setLastUpdated(new Date());
  }, [apiHealth, apiServiceStatus]);

  // Simulate periodic updates for non-API services
  useEffect(() => {
    const interval = setInterval(() => {
      setServices((prev) =>
        prev.map((s) => {
          if (s.id === "api") return s; // API is driven by real health data
          // Simulate slight status changes for realism
          if (s.id === "simulator") {
            const statuses: ServiceStatus[] = ["healthy", "degraded", "healthy"];
            return {
              ...s,
              status: statuses[Math.floor(Math.random() * statuses.length)],
              lastCheck: new Date().toISOString(),
              uptime: s.uptime + 10,
            };
          }
          return {
            ...s,
            lastCheck: new Date().toISOString(),
            uptime: s.uptime + 10,
          };
        }),
      );
      setLastUpdated(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    refetchApiHealth().finally(() => {
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          lastCheck: new Date().toISOString(),
          uptime: s.id === "api" ? (apiHealth?.uptime ? Math.floor(apiHealth.uptime) : 0) : s.uptime,
        })),
      );
      setLastUpdated(new Date());
      setRefreshing(false);
    });
  };

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const downCount = services.filter((s) => s.status === "down").length;

  return (
    <RequirePermission resource="admin" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Platform Health"
          description="Monitor system services and infrastructure status"
          actions={
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          }
        />

        {/* Status summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{services.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Healthy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{healthyCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Degraded</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{degradedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Down</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{downCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Service cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => {
            const status = statusConfig[service.status];
            const StatusIcon = status.icon;
            return (
              <Card key={service.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        service.status === "healthy" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                        service.status === "degraded" ? "bg-amber-100 dark:bg-amber-900/30" :
                        service.status === "down" ? "bg-red-100 dark:bg-red-900/30" :
                        "bg-slate-100 dark:bg-slate-800"
                      }`}>
                        {service.id === "bridge" && <Radio className="h-5 w-5 text-blue-500" />}
                        {service.id === "mqtt" && <Wifi className="h-5 w-5 text-emerald-500" />}
                        {service.id === "simulator" && <Cpu className="h-5 w-5 text-amber-500" />}
                        {service.id === "database" && <Database className="h-5 w-5 text-blue-500" />}
                        {service.id === "api" && <Server className="h-5 w-5 text-purple-500" />}
                      </div>
                      <div>
                        <CardTitle className="text-base">{service.name}</CardTitle>
                        <CardDescription className="mt-0.5">{service.description}</CardDescription>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bgColor} ${status.color}`}>
                      <StatusIcon className={`h-3 w-3 ${service.status === "connecting" ? "animate-spin" : ""}`} />
                      {status.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Uptime</p>
                      <p className="text-xs font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatUptime(service.uptime)}
                      </p>
                    </div>
                    {service.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-lg border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">{metric.label}</p>
                        <p className="text-xs font-semibold">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Last checked: {new Date(service.lastCheck).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* System metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              System Summary
            </CardTitle>
            <CardDescription>
              Platform health overview — last updated {lastUpdated.toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Overall Status</p>
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    downCount > 0 ? "bg-red-500" : degradedCount > 0 ? "bg-amber-500" : "bg-emerald-500"
                  }`} />
                  <p className="text-sm font-semibold">
                    {downCount > 0 ? "Degraded" : degradedCount > 0 ? "Degraded" : "Operational"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Total Uptime</p>
                <p className="text-sm font-semibold">
                  {formatUptime(Math.min(...services.filter(s => s.uptime > 0).map(s => s.uptime)))}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Total Devices</p>
                <p className="text-sm font-semibold">47</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Last Updated</p>
                <p className="text-sm font-semibold">{lastUpdated.toLocaleTimeString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  );
}
