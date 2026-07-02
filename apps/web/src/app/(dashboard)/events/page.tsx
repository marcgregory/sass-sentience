"use client";

import { useState, useMemo, useCallback } from "react";
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
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Info,
  X,
  WifiOff,
  Copy,
  ChevronDown,
} from "lucide-react";
import { formatRelativeTime, formatDateTime } from "@sentience/utils";
import { cn } from "@sentience/utils";
import { useLiveDeviceStore, type LiveEventEntry } from "@/stores/live-device-store";
import type { EventSeverity, EventCategory } from "@sentience/types";
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

// ─── Mock Events ─────────────────────────────────────────────────

const MOCK_EVENTS: (LiveEventEntry & { description?: string; userId?: string })[] = [
  { eventId: "EVT-001", title: "Device came online", severity: "info", category: "device_online", deviceId: "DEV-A3", siteId: "site-riverside-a", siteName: "Building A - Riverside", estateId: "estate-riverside", estateName: "Riverside Complex", timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(), description: "Device Gate Controller A3 reconnected after brief network interruption." },
  { eventId: "EVT-002", title: "Heartbeat received", severity: "info", category: "heartbeat", deviceId: "DEV-B7", siteId: "site-riverside-b", siteName: "Building B - Riverside", estateId: "estate-riverside", estateName: "Riverside Complex", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), description: "Routine heartbeat signal received from Sensor B7." },
  { eventId: "EVT-003", title: "Battery dropped below 20%", severity: "warning", category: "telemetry", deviceId: "DEV-B7", siteId: "site-riverside-b", siteName: "Building B - Riverside", estateId: "estate-riverside", estateName: "Riverside Complex", timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), description: "Sensor B7 battery level: 18%. Below 20% threshold. Replacement recommended." },
  { eventId: "EVT-004", title: "Device went offline", severity: "error", category: "device_offline", deviceId: "DEV-A1", siteId: "site-techvalley-1", siteName: "Warehouse 1 - Tech Valley", estateId: "estate-techvalley", estateName: "Tech Valley Park", timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(), description: "Access Controller A1 stopped responding. Last seen 42 minutes ago." },
  { eventId: "EVT-005", title: "Configuration change applied", severity: "info", category: "config_change", deviceId: "DEV-G4", siteId: "site-techvalley-1", siteName: "Warehouse 1 - Tech Valley", estateId: "estate-techvalley", estateName: "Tech Valley Park", userId: "John Smith (Installer)", timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), description: "Publish interval changed from 30s to 15s for Gateway 4." },
  { eventId: "EVT-006", title: "Firmware update initiated", severity: "info", category: "firmware_update", deviceId: "DEV-NW12", siteId: "site-harbour-main", siteName: "Main Terminal - Harbour", estateId: "estate-harbour", estateName: "Harbour Terminal", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), description: "Firmware v2.4.0 deployment initiated for Camera NW-12." },
  { eventId: "EVT-007", title: "Temperature critical threshold reached", severity: "critical", category: "telemetry", deviceId: "DEV-T3", siteId: "site-greenfield-a", siteName: "Server Hall A - Greenfield", estateId: "estate-greenfield", estateName: "Greenfield Data Centre", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), description: "Server Room A temperature reached 47°C. Exceeds critical threshold of 45°C." },
  { eventId: "EVT-008", title: "Alert triggered: device offline", severity: "critical", category: "alert_triggered", deviceId: "DEV-A1", siteId: "site-techvalley-1", siteName: "Warehouse 1 - Tech Valley", estateId: "estate-techvalley", estateName: "Tech Valley Park", timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(), description: "System alert created for Access Controller A1 offline event." },
  { eventId: "EVT-009", title: "Diagnostic: ping test passed", severity: "info", category: "diagnostic", deviceId: "DEV-G4", siteId: "site-techvalley-1", siteName: "Warehouse 1 - Tech Valley", estateId: "estate-techvalley", estateName: "Tech Valley Park", timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(), description: "Ping test to Gateway 4: latency 12ms, 0% packet loss." },
  { eventId: "EVT-010", title: "User logged in", severity: "info", category: "user_action", timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(), userId: "support@sentience.io", description: "User 'support@sentience.io' logged in from IP 192.168.1.100." },
  { eventId: "EVT-011", title: "Alert resolved: device offline", severity: "info", category: "alert_resolved", deviceId: "DEV-T3", siteId: "site-greenfield-a", siteName: "Server Hall A - Greenfield", estateId: "estate-greenfield", estateName: "Greenfield Data Centre", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), description: "Temperature alert for Server Room A resolved. Temperature returned to 32°C." },
  { eventId: "EVT-012", title: "Signal quality degraded", severity: "warning", category: "telemetry", deviceId: "DEV-G4", siteId: "site-techvalley-1", siteName: "Warehouse 1 - Tech Valley", estateId: "estate-techvalley", estateName: "Tech Valley Park", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), description: "Gateway 4 signal strength: -92 dBm. Below -90 dBm threshold." },
];

// ─── Severity Icon ───────────────────────────────────────────────

function SeverityDot({ severity, className }: { severity: string; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", severityDot[severity] ?? "bg-slate-400", className)} />;
}

// ─── Event Detail Panel ──────────────────────────────────────────

function EventDetailPanel({
  event,
  onClose,
}: {
  event: LiveEventEntry & { description?: string; userId?: string };
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
                  className="text-sm font-mono text-primary hover:underline"
                >
                  {event.deviceId}
                </Link>
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
  const storeEvents = useLiveDeviceStore((s) => s.recentEvents);
  const devices = useLiveDeviceStore((s) => s.devices);
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<(LiveEventEntry & { description?: string; userId?: string }) | null>(null);
  const [showMock, setShowMock] = useState(false);

  // Combine live + mock data
  const hasLiveEvents = storeEvents.length > 0;

  // All source events
  const sourceEvents = useMemo(() => {
    if (hasLiveEvents) {
      return storeEvents.map((e) => ({
        ...e,
        description: undefined,
        userId: undefined,
      }));
    }
    if (showMock) return MOCK_EVENTS;
    return [];
  }, [hasLiveEvents, storeEvents, showMock]);

  // Deduplicate by eventId
  const uniqueEvents = useMemo(() => {
    const seen = new Set<string>();
    return sourceEvents.filter((e) => {
      if (seen.has(e.eventId)) return false;
      seen.add(e.eventId);
      return true;
    });
  }, [sourceEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return uniqueEvents.filter((event) => {
      // Severity
      if (severityFilter !== "all" && event.severity !== severityFilter) return false;

      // Category
      if (categoryFilter !== "all" && event.category !== categoryFilter) return false;

      // Device
      if (deviceFilter !== "all" && event.deviceId !== deviceFilter) return false;

      // Date range
      if (dateRange !== "all") {
        const eventTime = new Date(event.timestamp).getTime();
        const now = Date.now();
        if (dateRange === "today" && now - eventTime > 24 * 60 * 60 * 1000) return false;
        if (dateRange === "7d" && now - eventTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateRange === "30d" && now - eventTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = event.title.toLowerCase().includes(q) ||
          event.deviceId?.toLowerCase().includes(q) ||
          event.eventId?.toLowerCase().includes(q) ||
          event.category?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [uniqueEvents, severityFilter, categoryFilter, deviceFilter, dateRange, searchQuery]);

  // Device options for filter
  const deviceOptions = useMemo(() => {
    const deviceIds = new Set<string>();
    const options: { id: string; name: string }[] = [];
    for (const event of uniqueEvents) {
      if (event.deviceId && !deviceIds.has(event.deviceId)) {
        deviceIds.add(event.deviceId);
        options.push({
          id: event.deviceId,
          name: `Device ${event.deviceId.slice(0, 8)}`,
        });
      }
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [uniqueEvents]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedEvents = filteredEvents.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = useCallback((setter: unknown) => {
    setPage(0);
    // @ts-expect-error — calling the setter inline
    setter();
  }, []);

  // CSV Export
  const handleExportCSV = useCallback(() => {
    const headers = ["Event ID", "Title", "Severity", "Category", "Device ID", "Site", "Estate", "Timestamp"];
    const rows = filteredEvents.map((e) => [
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
  }, [filteredEvents]);

  const hasFilters = severityFilter !== "all" || categoryFilter !== "all" || deviceFilter !== "all" || dateRange !== "all" || searchQuery.trim() !== "";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Event History"
        description="Complete audit trail of all device and system events"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowMock(!showMock)}>
              <Filter className="h-4 w-4 mr-1" />
              {showMock ? "Live Data" : "Demo Data"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredEvents.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Connection indicator */}
      {!hasLiveEvents && !showMock && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>
            No real-time connection.{" "}
            <button className="underline font-medium" onClick={() => setShowMock(true)}>
              Show demo data
            </button>{" "}
            to preview the event history experience.
          </span>
        </div>
      )}

      {!isSocketConnected && hasLiveEvents && (
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

          {filteredEvents.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
              {hasFilters ? " filtered" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Event list or EmptyState */}
      {filteredEvents.length === 0 ? (
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
            {pagedEvents.map((event) => (
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
                        className="font-mono hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {event.deviceId}
                      </Link>
                    )}
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
      {filteredEvents.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filteredEvents.length)} of {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
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
