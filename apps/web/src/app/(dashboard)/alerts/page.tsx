"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  BellOff,
  BellRing,
  CheckCircle,
  XCircle,
  Eye,
  History,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { formatRelativeTime, formatDateTime } from "@sentience/utils";
import { useLiveAlertStore, type AlertHistoryEntry } from "@/stores/live-alert-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from "@/hooks/use-alerts";
import type { AlertDisplayRow } from "@/hooks/use-alerts";
import { cn } from "@sentience/utils";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/permissions";

// ─── Constants ────────────────────────────────────────────────────

type SeverityFilter = "all" | "critical" | "warning" | "info";
type StatusFilter = "all" | "open" | "acknowledged" | "resolved";

const SEVERITY_OPTIONS: { key: SeverityFilter; label: string; icon: typeof AlertCircle }[] = [
  { key: "all", label: "All", icon: BellRing },
  { key: "critical", label: "Critical", icon: AlertTriangle },
  { key: "warning", label: "Warning", icon: AlertCircle },
  { key: "info", label: "Info", icon: Info },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "resolved", label: "Resolved" },
];

const severityBorderStyles: Record<string, string> = {
  critical: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

const severityBadgeVariants: Record<string, "destructive" | "warning" | "default"> = {
  critical: "destructive",
  warning: "warning",
  info: "default",
};

const statusStyles: Record<string, string> = {
  open: "text-red-600 dark:text-red-400",
  acknowledged: "text-amber-600 dark:text-amber-400",
  resolved: "text-emerald-600 dark:text-emerald-400",
};

const statusBgStyles: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400",
  acknowledged: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400",
};

// ─── Severity Icon ───────────────────────────────────────────────

function SeverityIcon({ severity, className }: { severity: string; className?: string }) {
  const cls = cn("h-4 w-4", className);
  switch (severity) {
    case "critical": return <AlertTriangle className={cls} />;
    case "warning": return <AlertCircle className={cls} />;
    default: return <Info className={cls} />;
  }
}

// ─── Alert Timeline ──────────────────────────────────────────────

function AlertTimeline({ history }: { history: AlertHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-0">
      <h4 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" />
        Timeline
      </h4>
      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-[6px] bottom-[6px] w-px bg-border" />

        {history.map((entry, i) => (
          <div key={i} className="relative pb-4 last:pb-0">
            {/* Dot */}
            <div
              className={cn(
                "absolute -left-[17px] top-[4px] h-[14px] w-[14px] rounded-full border-2",
                entry.toStatus === "open"
                  ? "border-red-500 bg-red-100 dark:bg-red-900/50"
                  : entry.toStatus === "acknowledged"
                  ? "border-amber-500 bg-amber-100 dark:bg-amber-900/50"
                  : "border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50",
              )}
            />
            <p className="text-xs font-medium text-foreground">
              {entry.fromStatus === entry.toStatus
                ? "Alert created"
                : `${entry.fromStatus} → ${entry.toStatus}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(entry.timestamp)}
              {entry.by ? ` by ${entry.by}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Detail Sheet ───────────────────────────────────────────

function AlertDetailSheet({
  alert,
  history,
  onClose,
  onAcknowledge,
  onResolve,
  canManageAlerts,
}: {
  alert: AlertDisplayRow;
  history: AlertHistoryEntry[];
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  canManageAlerts: boolean;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-background shadow-xl animate-slide-in-right overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Alert Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6 p-6">
          {/* Title + Badges */}
          <div>
            <h3 className="text-xl font-semibold mb-2">{alert.title}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant={severityBadgeVariants[alert.severity] ?? "default"}>
                <SeverityIcon severity={alert.severity} className="mr-1 h-3 w-3" />
                {alert.severity}
              </Badge>
              <span className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold", statusBgStyles[alert.status])}>
                {alert.status}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Description</h4>
            <p className="text-sm text-muted-foreground">{alert.description}</p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Category</p>
              <p className="text-sm capitalize">{alert.category.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Source</p>
              <p className="text-sm capitalize">{alert.source}</p>
            </div>
            {alert.deviceId && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Device</p>
                <p className="text-sm font-mono">{alert.deviceId}</p>
              </div>
            )}
            {alert.siteName && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Site</p>
                <p className="text-sm">{alert.siteName}</p>
              </div>
            )}
            {alert.estateName && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Estate</p>
                <p className="text-sm">{alert.estateName}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Occurred</p>
              <p className="text-sm">{formatDateTime(alert.occurredAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Created</p>
              <p className="text-sm">{formatDateTime(alert.createdAt)}</p>
            </div>
            {alert.acknowledgedAt && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Acknowledged</p>
                <p className="text-sm">
                  {formatDateTime(alert.acknowledgedAt)}
                  {alert.acknowledgedBy ? ` by ${alert.acknowledgedBy}` : ""}
                </p>
              </div>
            )}
            {alert.resolvedAt && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Resolved</p>
                <p className="text-sm">
                  {formatDateTime(alert.resolvedAt)}
                  {alert.resolvedBy ? ` by ${alert.resolvedBy}` : ""}
                </p>
              </div>
            )}
            {alert.resolution && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Resolution</p>
                <p className="text-sm">{alert.resolution}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {canManageAlerts && alert.status !== "resolved" && (
            <div className="flex gap-2 pt-2 border-t">
              {alert.status === "open" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onAcknowledge(alert.id)}
                  className="flex-1"
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Acknowledge
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onResolve(alert.id)}
                className="flex-1"
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Resolve
              </Button>
            </div>
          )}

          {/* Timeline */}
          {history.length > 0 && (
            <div className="pt-2 border-t">
              <AlertTimeline history={history} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────

function AlertsPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary card skeletons */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="h-8 w-12 rounded bg-muted animate-pulse" />
            <div className="h-4 w-20 mt-2 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        <div className="h-9 w-72 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-64 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Alert row skeletons */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-16 rounded-md bg-muted animate-pulse" />
              <div className="h-5 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-1/2 mt-2 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Error State ───────────────────────────────────────────────────

function AlertsPageError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Alerts"
        description="Monitor and manage system alerts"
      />
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
          Failed to load alerts
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          {error?.message ?? "An unexpected error occurred while fetching alert data."}
        </p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Retry
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function AlertsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canManageAlerts = hasPermission(currentUser?.role, "alerts", "update");
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);

  const { alerts, total, isLoading, isError, error, isSocketConnected } = useAlerts();
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();

  const storeHistory = useLiveAlertStore((s) => s.alertHistory);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Apply client-side filters
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
      if (statusFilter !== "all" && alert.status !== statusFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, statusFilter]);

  // Summary counts (only non-resolved alerts)
  const criticalCount = alerts.filter((a) => a.severity === "critical" && a.status !== "resolved").length;
  const warningCount = alerts.filter((a) => a.severity === "warning" && a.status !== "resolved").length;
  const infoCount = alerts.filter((a) => a.severity === "info" && a.status !== "resolved").length;
  const totalActive = criticalCount + warningCount + infoCount;

  // Selected alert detail
  const selectedAlert = selectedAlertId
    ? alerts.find((a) => a.id === selectedAlertId) ?? null
    : null;
  const selectedHistory = selectedAlertId
    ? (storeHistory[selectedAlertId] ?? [])
    : [];

  // ─── Loading State ──────────────────────────────────────────
  if (isLoading) {
    return <AlertsPageSkeleton />;
  }

  // ─── Error State ────────────────────────────────────────────
  if (isError) {
    return <AlertsPageError error={error as Error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Alerts"
        description="Monitor and manage system alerts"
      />

      {/* Simulator Mode banner */}
      {simulatorMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Simulator Mode — showing live alert feed. Toggle Sim OFF in the
            header to return to database view.
          </span>
        </div>
      )}

      {/* Connection indicator */}
      {!isSocketConnected && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
          Showing cached alerts — real-time connection is offline.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-2xl font-bold">{totalActive}</p>
          <p className="text-sm text-muted-foreground">Active Alerts</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalCount}</p>
          <p className="text-sm text-muted-foreground">Critical</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{warningCount}</p>
          <p className="text-sm text-muted-foreground">Warning</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{infoCount}</p>
          <p className="text-sm text-muted-foreground">Info</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Severity filters */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              role="radio"
              aria-checked={severityFilter === opt.key}
              onClick={() => setSeverityFilter(opt.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                severityFilter === opt.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground">|</span>

        {/* Status filters */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              role="radio"
              aria-checked={statusFilter === opt.key}
              onClick={() => setStatusFilter(opt.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === opt.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {filteredAlerts.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredAlerts.length} of {alerts.length} alerts
          </span>
        )}
      </div>

      {/* Alert list or EmptyState */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No alerts to display"
          description={
            alerts.length === 0
              ? "Your alert feed is clear. All devices are operating normally."
              : "No alerts match the current filters. Try adjusting your filter selection."
          }
          action={
            alerts.length > 0
              ? { label: "Clear Filters", onClick: () => { setSeverityFilter("all"); setStatusFilter("all"); } }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-lg border-l-4 bg-card p-4 shadow-sm transition-colors hover:bg-accent/50 cursor-pointer",
                severityBorderStyles[alert.severity],
              )}
              onClick={() => setSelectedAlertId(alert.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant={severityBadgeVariants[alert.severity] ?? "default"}>
                      <SeverityIcon severity={alert.severity} className="mr-1 h-3 w-3" />
                      {alert.severity}
                    </Badge>
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold", statusBgStyles[alert.status])}>
                      {alert.status}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {alert.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="font-medium truncate">{alert.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {alert.siteName && <span>{alert.siteName} · </span>}
                    {alert.deviceId && <span className="font-mono">{alert.deviceId} · </span>}
                    <time dateTime={alert.occurredAt}>{formatRelativeTime(alert.occurredAt)}</time>
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {canManageAlerts && alert.status === "open" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => acknowledgeMutation.mutate({ id: alert.id })}
                      title="Acknowledge"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {canManageAlerts && alert.status !== "resolved" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => resolveMutation.mutate({ id: alert.id })}
                      title="Resolve"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="View details" onClick={() => setSelectedAlertId(alert.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert Detail Sheet */}
      {selectedAlert && (
        <AlertDetailSheet
          alert={selectedAlert}
          history={selectedHistory}
          canManageAlerts={canManageAlerts}
          onClose={() => setSelectedAlertId(null)}
          onAcknowledge={(id) => {
            acknowledgeMutation.mutate({ id });
          }}
          onResolve={(id) => {
            resolveMutation.mutate({ id });
          }}
        />
      )}
    </div>
  );
}
