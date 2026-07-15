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
import { usePlatformHealth } from "@/hooks/use-platform-health";
import { useSimulatorRestart } from "@/hooks/use-simulator-restart";
import type { HealthService } from "@/lib/admin";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";

type ServiceStatus = "healthy" | "degraded" | "down" | "connecting" | "disconnected";

const statusConfig: Record<ServiceStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  healthy: { label: "Healthy", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/50", icon: CheckCircle2 },
  degraded: { label: "Degraded", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/50", icon: AlertTriangle },
  down: { label: "Down", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/50", icon: XCircle },
  connecting: { label: "Connecting", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/50", icon: Loader2 },
  disconnected: { label: "Disconnected", color: "text-slate-500 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800", icon: XCircle },
};

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
  const [restartToast, setRestartToast] = useState<{ title: string; message: string; priority: "normal" | "high" } | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const simulatorRestart = useSimulatorRestart();
  const canRestartSimulator = currentUser?.role === "admin";

  const { data: health, isLoading, isError, error, refetch } = usePlatformHealth();

  // ─── Toast auto-dismiss ──────────────────────────────────────────

  useEffect(() => {
    if (!restartToast) return;
    const timeout = window.setTimeout(() => setRestartToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [restartToast]);

  // ─── Notify restart ──────────────────────────────────────────────

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
    refetch();
  };

  // ─── Derive summary counts ───────────────────────────────────────

  const services: HealthService[] = health?.services ?? [];
  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const downCount = services.filter((s) => s.status === "down").length;
  const isDown = downCount > 0;
  const isDegraded = degradedCount > 0;

  const serviceIcon = (id: string) => {
    switch (id) {
      case "bridge": return <Radio className="h-5 w-5 text-blue-500" />;
      case "mqtt": return <Wifi className="h-5 w-5 text-emerald-500" />;
      case "simulator": return <Cpu className="h-5 w-5 text-amber-500" />;
      case "database": return <Database className="h-5 w-5 text-blue-500" />;
      case "api": return <Server className="h-5 w-5 text-purple-500" />;
      default: return <Server className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Find API service for the system summary
  const apiService = services.find((s) => s.id === "api");
  const dbService = services.find((s) => s.id === "database");

  return (
    <RequirePermission resource="admin" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Platform Health"
          description="Monitor system services and infrastructure status"
          actions={
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          }
        />

        {/* Loading state */}
        {isLoading && !health && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Checking platform services...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && !health && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium">Failed to fetch platform health</p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "Unable to connect to the health endpoint"}
              </p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Health data */}
        {health && (
          <>
            {/* Status summary cards */}
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
                const status = statusConfig[service.status] ?? statusConfig.disconnected;
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
                            {serviceIcon(service.id)}
                          </div>
                          <div>
                            <CardTitle className="text-base">{service.name}</CardTitle>
                            <CardDescription className="mt-0.5">{service.description}</CardDescription>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bgColor} ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
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

            {/* Toast notifications */}
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

            {/* System summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  System Summary
                </CardTitle>
                <CardDescription>
                  Platform health overview — last updated {new Date(health.lastChecked).toLocaleTimeString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Overall Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        isDown ? "bg-red-500" : isDegraded ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <p className="text-sm font-semibold">
                        {isDown ? "Degraded" : isDegraded ? "Degraded" : "Operational"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">API Uptime</p>
                    <p className="text-sm font-semibold">
                      {apiService ? formatUptime(apiService.uptime) : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">DB Status</p>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${dbService?.status === "healthy" ? "bg-emerald-500" : "bg-red-500"}`} />
                      {dbService?.status === "healthy" ? "Connected" : "Unhealthy"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Last Updated</p>
                    <p className="text-sm font-semibold">{new Date(health.lastChecked).toLocaleTimeString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
