"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FileSearch,
  Search,
  XCircle,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Copy,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { formatRelativeTime, formatDateTime } from "@sentience/utils";
import { cn } from "@sentience/utils";
import { useEvents } from "@/hooks/use-events";
import { useDebounce } from "@/hooks/use-debounce";
import type { EventDisplayRow } from "@/lib/events";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
import type { EventSeverity } from "@sentience/types";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────

type SeverityFilter = "all" | EventSeverity;
type DateRange = "all" | "today" | "7d" | "30d";

const SEVERITY_OPTIONS: { key: SeverityFilter; label: string; color: string }[] = [
  { key: "all", label: "All", color: "text-foreground" },
  { key: "critical", label: "Critical", color: "text-red-500" },
  { key: "error", label: "Error", color: "text-red-400" },
  { key: "warning", label: "Warning", color: "text-amber-500" },
  { key: "info", label: "Info", color: "text-blue-500" },
];

const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: "all", label: "All Categories" },
  { key: "device_online", label: "Online" },
  { key: "device_offline", label: "Offline" },
  { key: "device_fault", label: "Fault" },
  { key: "heartbeat", label: "Heartbeat" },
  { key: "telemetry", label: "Telemetry" },
  { key: "config_change", label: "Config Change" },
  { key: "firmware_update", label: "Firmware" },
  { key: "alert_triggered", label: "Alert Triggered" },
  { key: "alert_resolved", label: "Alert Resolved" },
  { key: "diagnostic", label: "Diagnostic" },
  { key: "system", label: "System" },
  { key: "user_action", label: "User Action" },
];

const DATE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
];

const severityDot: Record<string, string> = {
  critical: "bg-red-500",
  error: "bg-red-400",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

const severityBadge: Record<string, "destructive" | "warning" | "default" | "outline"> = {
  critical: "destructive",
  error: "destructive",
  warning: "warning",
  info: "default",
};

const PAGE_SIZE = 20;

// ─── Severity Icon ───────────────────────────────────────────────

function SeverityDot({ severity, className }: { severity: string; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", severityDot[severity] ?? "bg-slate-400", className)} />;
}

// ─── Loading Skeleton ────────────────────────────────────────────

function EventsLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter bar skeleton */}
      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-72 rounded-lg bg-muted animate-pulse" />
        <div className="h-10 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="h-10 w-44 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-96 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-72 rounded-lg bg-muted animate-pulse" />
      </div>
      {/* List skeleton */}
      <div className="rounded-lg border divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-2.5 w-2.5 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                <div className="h-5 w-16 rounded-md bg-muted animate-pulse" />
                <div className="h-5 w-20 rounded-md bg-muted animate-pulse" />
              </div>
              <div className="h-3 w-72 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────

function EventsErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">Failed to load events</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        {error.message === "Failed to fetch"
          ? "The API server is unreachable. Make sure the backend is running."
          : error.message}
      </p>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-1" />
        Retry
      </Button>
    </div>
  );
}

// ─── Event Detail Panel ──────────────────────────────────────────

function EventDetailPanel({
  event,
  onClose,
}: {
  event: EventDisplayRow;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-background shadow-xl animate-slide-in-right overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Event Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6 p-6">
          {/* Title + Badges */}
          <div>
            <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
            <div className="flex flex-wrap gap-2">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold",
                event.severity === "critical" || event.severity === "error"
                  ? "border-transparent bg-destructive text-destructive-foreground shadow"
                  : event.severity === "warning"
                  ? "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400"
                  : "border-transparent bg-primary text-primary-foreground shadow",
              )}>
                <SeverityDot severity={event.severity} />
                {event.severity}
              </span>
              <Badge variant="outline" className="capitalize">
                {event.category?.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {event.deviceId && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Device</p>
                <Link
                  href={`/devices/${event.deviceId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {event.deviceName ?? event.deviceId}
                </Link>
                {event.serial && (
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {event.serial}
                  </p>
                )}
              </div>
            )}
            {event.siteName && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Site</p>
                <p className="text-sm">{event.siteName}</p>
              </div>
            )}
            {event.estateName && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Estate</p>
                <p className="text-sm">{event.estateName}</p>
              </div>
            )}
            {event.userId && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-muted-foreground">User</p>
                <p className="text-sm">{event.userId}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Event ID</p>
              <div className="flex items-center gap-1">
                <p className="text-sm font-mono">{event.eventId}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(event.eventId)}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy Event ID"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Time</p>
              <p className="text-sm">{formatDateTime(event.timestamp)}</p>
            </div>
            {event.siteId && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Site ID</p>
                <p className="text-sm font-mono">{event.siteId}</p>
              </div>
            )}
            {event.estateId && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Estate ID</p>
                <p className="text-sm font-mono">{event.estateId}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(event, null, 2))}
              className="flex-1"
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy JSON
            </Button>
          </div>

          {/* Raw Data */}
          <details className="group border-t pt-4">
            <summary className="flex cursor-pointer items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              Raw Metadata
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs font-mono">
              {JSON.stringify(event, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function EventsPage() {
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<EventDisplayRow | null>(null);

  // Compute date range start for API filtering
  const startDate = useMemo(() => {
    if (dateRange === "all") return undefined;
    const d = new Date();
    if (dateRange === "today") d.setDate(d.getDate() - 1);
    else if (dateRange === "7d") d.setDate(d.getDate() - 7);
    else if (dateRange === "30d") d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, [dateRange]);

  // Fetch events — in normal mode from API, in sim mode from live store
  const {
    events: sourceEvents,
    isLoading,
    isError,
    error,
    total: apiTotal,
  } = useEvents({
    severity: severityFilter !== "all" ? severityFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    deviceId: deviceFilter !== "all" ? deviceFilter : undefined,
    search: debouncedSearch || undefined,
    startDate,
    page: page + 1,
    limit: PAGE_SIZE,
  });

  // Deduplicate by eventId — handle both API (pagination can overlap) and live data
  const events = useMemo(() => {
    const seen = new Set<string>();
    return sourceEvents.filter((e) => {
      if (seen.has(e.eventId)) return false;
      seen.add(e.eventId);
      return true;
    });
  }, [sourceEvents]);

  // Device options for filter (built from live and API events)
  const deviceOptions = useMemo(() => {
    const deviceIds = new Map<string, string>();
    const options: { id: string; name: string }[] = [];
    for (const event of events) {
      if (event.deviceId && !deviceIds.has(event.deviceId)) {
        deviceIds.set(event.deviceId, event.deviceName ?? "");
        options.push({
          id: event.deviceId,
          name: event.deviceName ?? `Device ${event.deviceId.slice(0, 8)}`,
        });
      }
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [events]);

  // Total count: when simulator mode is on, use events.length directly
  const safeTotal = simulatorMode ? events.length : Math.max(apiTotal, events.length);
  const totalPages = Math.max(1, Math.ceil(safeTotal / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  // Reset page to 0 when filters change
  useEffect(() => { setPage(0); }, [severityFilter, categoryFilter, deviceFilter, dateRange, searchQuery]);

  // CSV Export (fetch all matching events — limited to first 10k for safety)
  const handleExportCSV = useCallback(() => {
    const headers = ["Event ID", "Title", "Severity", "Category", "Device ID", "Site", "Estate", "Timestamp"];
    const rows = events.map((e) => [
      e.eventId,
      `"${e.title.replace(/"/g, '""')}"`,
      e.severity,
      e.category ?? "",
      e.deviceId ?? "",
      e.siteName ?? e.siteId ?? "",
      e.estateName ?? e.estateId ?? "",
      e.timestamp,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  const hasFilters = severityFilter !== "all" || categoryFilter !== "all" || deviceFilter !== "all" || dateRange !== "all" || searchQuery.trim() !== "";

  // ─── Loading state (initial only — keep content during search refetches) ─
  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Event History"
          description="Complete audit trail of all device and system events"
          actions={
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          }
        />
        <EventsLoadingSkeleton />
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Event History"
          description="Complete audit trail of all device and system events"
        />
        <EventsErrorState error={error as Error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Event History"
        description="Complete audit trail of all device and system events"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={events.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Simulator Mode banner */}
      {simulatorMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Simulator Mode — showing live event feed. Toggle Sim OFF in the
            header to return to database view.
          </span>
        </div>
      )}

      {/* Connection indicator */}
      {!isSocketConnected && events.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
          Showing cached events — real-time connection is offline.
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Search + Device */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              aria-label="Search events"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full rounded-lg border bg-card py-2 pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setPage(0); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Device filter */}
          <select
            value={deviceFilter}
            onChange={(e) => { setDeviceFilter(e.target.value); setPage(0); }}
            className="rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
          >
            <option value="all">All Devices</option>
            {deviceOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name} ({opt.id.slice(0, 6)})</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            className="rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Severity + Date */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity */}
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                role="radio"
                aria-checked={severityFilter === opt.key}
                onClick={() => { setSeverityFilter(opt.key); setPage(0); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  severityFilter === opt.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <SeverityDot severity={opt.key === "all" ? "info" : opt.key} />
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground">|</span>

          {/* Date range */}
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                role="radio"
                aria-checked={dateRange === opt.key}
                onClick={() => { setDateRange(opt.key); setPage(0); }}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  dateRange === opt.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSeverityFilter("all"); setCategoryFilter("all"); setDeviceFilter("all"); setDateRange("all"); setSearchQuery(""); setPage(0); }}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}

          {events.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {safeTotal} event{safeTotal !== 1 ? "s" : ""}
              {hasFilters ? " filtered" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Event list or EmptyState */}
      {events.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No events found"
          description={
            hasFilters
              ? "No events match your current filters. Try adjusting your search or filter criteria."
              : "No events recorded yet. Events will appear here when devices start reporting."
          }
          action={
            hasFilters
              ? { label: "Clear Filters", onClick: () => { setSeverityFilter("all"); setCategoryFilter("all"); setDeviceFilter("all"); setDateRange("all"); setSearchQuery(""); setPage(0); } }
              : undefined
          }
        />
      ) : (
        <div className="rounded-lg border">
          <div className="divide-y">
            {events.map((event) => (
              <div
                key={event.eventId}
                className="flex items-start gap-4 p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="mt-1.5 shrink-0">
                  <SeverityDot severity={event.severity} className="h-2.5 w-2.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-medium">{event.title}</p>
                    <Badge variant={severityBadge[event.severity] ?? "default"} className="capitalize text-xs">
                      {event.severity}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-xs">
                      {event.category?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.deviceId && (
                      <Link
                        href={`/devices/${event.deviceId}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {event.deviceName ?? event.deviceId}
                      </Link>
                    )}
                    {event.deviceId && event.serial && <span className="font-mono text-[10px]"> · {event.serial.slice(0, 8)}</span>}
                    {event.deviceId && event.siteName && <span> · </span>}
                    {event.siteName && <span>{event.siteName}</span>}
                    {event.siteName && <span> · </span>}
                    <time dateTime={event.timestamp}>{formatRelativeTime(event.timestamp)}</time>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {events.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, safeTotal)} of {safeTotal} event{safeTotal !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Event Detail Panel */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
