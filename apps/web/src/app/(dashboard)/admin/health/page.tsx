"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/components/shared/require-permission";
import {
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
import { useSimulatorRestart } from "@/hooks/use-simulator-restart";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";

const statusConfig: Record<ServiceStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  healthy: { label: "Healthy", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/50", icon: CheckCircle2 },
  degraded: { label: "Degraded", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/50", icon: AlertTriangle },
  down: { label: "Down", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/50", icon: XCircle },
  connecting: { label: "Connecting", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/50", icon: Loader2 },
  disconnected: { label: "Disconnected", color: "text-slate-500 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800", icon: XCircle },
};

/**
 * Initial static service definitions for services that don't have
 * real backend health endpoints yet. As each service gets a health
 * endpoint, its data here should be replaced with a real API query.
 */
const staticServices: PlatformService[] = [
  {
    id: "bridge",
    name: "Realtime Bridge",
    status: "healthy",
    description: "Socket.IO gateway connecting MQTT events to the web application",
    uptime: 345600,
    lastCheck: new Date().toISOString(),
    metrics: [
      { label: "Events/sec", value: "—" },
      { label: "Connected Clients", value: "—" },
      { label: "Queue Depth", value: "—" },
    ],
  },
  {
    id: "mqtt",
    name: "MQTT Broker",
    status: "healthy",
    description: "Mosquitto message broker for device telemetry",
    uptime: 518400,
    lastCheck: new Date().toISOString(),
    metrics: [
      { label: "Connected Devices", value: "—" },
      { label: "Messages/sec", value: "—" },
      { label: "Subscriptions", value: "—" },
    ],
  },
  {
    id: "simulator",
    name: "Device Simulator",
    status: "healthy",
    description: "Faker-based device telemetry simulator for development and testing",
    uptime: 86400,
    lastCheck: new Date().toISOString(),
    metrics: [
      { label: "Simulated Devices", value: "—" },
      { label: "Publish Rate", value: "—" },
      { label: "Last Published", value: "—" },
    ],
  },
  {
    id: "database",
    name: "Database",
    status: "healthy",
    description: "PostgreSQL 16 — primary data store",
    uptime: 604800,
    lastCheck: new Date().toISOString(),
    metrics: [
      { label: "Connection Pool", value: "—" },
      { label: "Storage Used", value: "—" },
      { label: "Query Latency", value: "—" },
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
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [restartToast, setRestartToast] = useState<{ title: string; message: string; priority: "normal" | "high" } | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const simulatorRestart = useSimulatorRestart();
  const canRestartSimulator = currentUser?.role === "admin";

  // Poll the real API health endpoint
  const { data: apiHealth, isLoading: healthLoading, refetch: refetchApiHealth } = useApiHealth();

  // Derive the API service status from real health data
  const apiServiceStatus: ServiceStatus = !apiHealth
    ? "disconnected"
    : apiHealth.db.status === "unhealthy"
      ? "degraded"
      : "healthy";

  // Build the services list: static services + real API health
  const services: PlatformService[] = [
    ...staticServices.map((s) => s.id === "api" ? s : s),
    // API service — derived from real health endpoint
    {
      id: "api",
      name: "API Service",
      status: apiServiceStatus,
      description: "REST API — Fastify 5 + Drizzle ORM + PostgreSQL",
      uptime: apiHealth ? Math.max(0, Math.floor(apiHealth.uptime)) : 0,
      lastCheck: apiHealth?.timestamp ?? new Date().toISOString(),
      metrics: apiHealth
        ? [
            { label: "Uptime", value: formatUptime(Math.max(0, Math.floor(apiHealth.uptime))) },
            { label: "DB Latency", value: apiHealth.db.latency ?? "—" },
            { label: "Status", value: apiHealth.status === "ok" ? "Online" : "Error" },
          ]
        : [
            { label: "Uptime", value: "N/A" },
            { label: "DB Latency", value: "—" },
            { label: "Status", value: healthLoading ? "Checking..." : "Offline" },
          ],
    },
  ];

  // Update last-checked timestamp when API health refreshes
  useEffect(() => {
    if (apiHealth) {
      setLastUpdated(new Date());
    }
  }, [apiHealth]);

  useEffect(() => {
    if (!restartToast) return;
    const timeout = window.setTimeout(() => setRestartToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [restartToast]);

  const notifyRestart = (title: string, message: string, priority: "normal" | "high") => {
    setRestartToast({ title, message, priority });
    addNotification({
      id: `sim-restart-${Date.now()}`,
      userId: currentUser?.id ?? "system",
      title,
      message,
      priority,
      category: "system",
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  };

  const handleRestartSimulator = () => {
    simulatorRestart.mutate(undefined, {
      onSuccess: (data) => {
        notifyRestart(
          "Simulator restart requested",
          data.deployId
            ? `Render accepted the simulator restart request (${data.deployId}).`
            : "Render accepted the simulator restart request.",
          "normal",
        );
      },
      onError: (error) => {
        const message = error instanceof ApiError
          ? error.message
          : "Unable to restart the simulator service.";
        notifyRestart("Simulator restart failed", message, "high");
      },
    });
  };

  const handleRefresh = () => {
    refetchApiHealth().finally(() => {
      setLastUpdated(new Date());
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
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={healthLoading}>
              {healthLoading ? (
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
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] text-muted-foreground">
                      Last checked: {new Date(service.lastCheck).toLocaleTimeString()}
                    </p>
                    {service.id === "simulator" && canRestartSimulator && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRestartSimulator}
                        disabled={simulatorRestart.isPending}
                        aria-label="Restart simulator service"
                      >
                        {simulatorRestart.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Restart Simulator
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {restartToast && (
          <div
            role={restartToast.priority === "high" ? "alert" : "status"}
            className={`fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-md border bg-background p-3 shadow-lg ${
              restartToast.priority === "high" ? "border-red-200 dark:border-red-900" : "border-emerald-200 dark:border-emerald-900"
            }`}
          >
            <div className="flex items-start gap-2">
              {restartToast.priority === "high" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              )}
              <div>
                <p className="text-sm font-medium">{restartToast.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{restartToast.message}</p>
              </div>
            </div>
          </div>
        )}

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
                <p className="text-xs text-muted-foreground mb-0.5">API Uptime</p>
                <p className="text-sm font-semibold">
                  {apiHealth ? formatUptime(Math.max(0, Math.floor(apiHealth.uptime))) : "N/A"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-0.5">DB Status</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${apiHealth?.db.status === "healthy" ? "bg-emerald-500" : "bg-red-500"}`} />
                  {apiHealth?.db.status === "healthy" ? "Connected" : "Unhealthy"}
                </p>
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
