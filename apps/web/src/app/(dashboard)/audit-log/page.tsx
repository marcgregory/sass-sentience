"use client";

import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@sentience/utils";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { useAuditStore } from "@/stores/audit-store";
import { RequirePermission } from "@/components/shared/require-permission";
import { ROLE_META } from "@/lib/permissions";
import {
  Download,
  Search,
  X,
  ClipboardList,
  XCircle,
  ChevronRight,
  User,
  Globe,
  Monitor,
  Shield,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { AuditLogApiItem } from "@/lib/audit-logs";

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400",
  login: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400",
  logout: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  export: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400",
  permission_change: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-400",
  password_reset: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400",
  mfa_change: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-400",
};

const actionLabels: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  login: "Login",
  logout: "Logout",
  export: "Exported",
  permission_change: "Permission Change",
  password_reset: "Password Reset",
  mfa_change: "MFA Change",
};

const severityColors: Record<string, string> = {
  critical: "text-red-500",
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
  debug: "text-slate-400",
};

// Severity mapping for audit actions
const actionSeverity: Record<string, string> = {
  delete: "critical",
  permission_change: "critical",
  password_reset: "warning",
  mfa_change: "warning",
  update: "info",
  create: "info",
  login: "info",
  logout: "debug",
  export: "info",
};

const ACTION_OPTIONS = [
  "all",
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "permission_change",
  "password_reset",
  "mfa_change",
] as const;

const SeverityIndicator = ({ action }: { action: string }) => {
  const sev = actionSeverity[action] ?? "info";
  const color = severityColors[sev] ?? "text-blue-500";
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${color.replace("text-", "bg-")} ${sev === "critical" ? "animate-pulse" : ""}`} title={`Severity: ${sev}`} />
  );
};

export default function AuditLogPage() {
  const localEntries = useAuditStore((s) => s.entries);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogApiItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const perPage = 15;

  // Build API query params from filter state — filters are applied server-side
  const apiParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page,
      limit: perPage,
    };
    if (search) params.search = search;
    if (actionFilter !== "all") params.action = actionFilter;
    params.sort = "createdAt";
    params.order = "desc";
    return params;
  }, [search, actionFilter, page]);

  // Fetch audit log entries from API with server-side filtering
  const {
    entries: apiEntries,
    pagination,
    isLoading,
    isError,
    error,
    refetch,
  } = useAuditLogs(apiParams);

  // Merge API entries with locally-created entries (from this session)
  // Local entries appear first (most recent)
  const mergedEntries = useMemo(() => {
    const combined = [...localEntries, ...apiEntries];
    // De-duplicate by ID in case a local entry was persisted and now comes via API
    const seen = new Set<string>();
    return combined.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [localEntries, apiEntries]);

  // Get unique action types from merged entries
  const actionTypes = useMemo(() => {
    const types = new Set(mergedEntries.map((e) => e.action));
    return Array.from(types);
  }, [mergedEntries]);

  const totalCount = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 1;
  // We use mergedEntries for display so local entries show, but respect API pagination for the total
  // Local entries are usually just 1-2 from the current session, so they don't affect pagination materially

  const handleCSVExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const { getAuditLogs } = await import("@/lib/audit-logs");
      const exportParams: Record<string, unknown> = { limit: 10000 };
      if (search) exportParams.search = search;
      if (actionFilter !== "all") exportParams.action = actionFilter;
      exportParams.sort = "createdAt";
      exportParams.order = "desc";
      const result = await getAuditLogs(exportParams);

      // Merge local entries not yet in the API result
      const allIds = new Set(result.data.map((e: AuditLogApiItem) => e.id));
      const localOnly = localEntries.filter((e) => !allIds.has(e.id));
      const exportData = [...localOnly, ...result.data];

      const headers = ["ID", "User", "Action", "Resource", "Resource ID", "Description", "Timestamp", "IP Address"];
      const rows = exportData.map((e: AuditLogApiItem) => [
        e.id,
        e.userName,
        e.action,
        e.resource,
        e.resourceId ?? "",
        e.description,
        new Date(e.createdAt).toISOString(),
        e.ipAddress ?? "",
      ]);
      const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [search, actionFilter, localEntries]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleActionFilter = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setActionFilter("all");
    setPage(1);
  };

  const hasActiveFilters = search || actionFilter !== "all";

  return (
    <RequirePermission resource="audit-log" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Audit Log"
          description="Track all system activity and changes"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCSVExport} disabled={isExporting}>
                <Download className="h-4 w-4" />
                {isExporting ? "Exporting..." : `Export CSV (${totalCount})`}
              </Button>
            </div>
          }
        />

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Filtered</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Unique Users</p>
            <p className="text-2xl font-bold">
              {new Set(mergedEntries.map((e) => e.userId)).size}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Actions</p>
            <p className="text-2xl font-bold">{actionTypes.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search audit log"
              placeholder="Search audit log..."
              value={search}
              onChange={(e) => { handleSearch(e.target.value); }}
              className="w-full rounded-md border bg-background py-2 pl-10 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={actionFilter}
            onChange={(e) => { handleActionFilter(e.target.value); }}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Actions</option>
            {ACTION_OPTIONS.filter((a) => a !== "all").map((a) => (
              <option key={a} value={a}>{actionLabels[a] ?? a}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <XCircle className="h-3.5 w-3.5" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading audit log…</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium">Failed to load audit log</p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "The audit log data could not be fetched."}
                {" "}Showing locally recorded entries where available.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !isError && mergedEntries.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="No audit entries found"
            description={
              hasActiveFilters
                ? "Try adjusting your search or filters"
                : "No audit activity recorded yet"
            }
          />
        )}

        {/* Audit entries */}
        {mergedEntries.length > 0 && (
          <>
            <div className="rounded-lg border">
              <div className="divide-y">
                {mergedEntries.map((log) => {
                  const sev = actionSeverity[log.action] ?? "info";
                  return (
                    <button
                      key={log.id}
                      onClick={() => setSelectedEntry(log)}
                      className="flex w-full items-start gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
                    >
                      {/* Severity bar */}
                      <div className={`w-0.5 h-full min-h-[3rem] shrink-0 rounded-full ${
                        sev === "critical" ? "bg-red-500" :
                        sev === "warning" ? "bg-amber-500" :
                        sev === "info" ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                      }`} />

                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        log.userRole === "system"
                          ? "bg-muted text-muted-foreground"
                          : ROLE_META[log.userRole as keyof typeof ROLE_META]?.bgColor ?? "bg-muted"
                      } ${
                        ROLE_META[log.userRole as keyof typeof ROLE_META]?.color ?? ""
                      }`}>
                        {log.userName.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <SeverityIndicator action={log.action} />
                          <p className="text-sm font-medium">{log.userName}</p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${actionColors[log.action] ?? "bg-muted text-muted-foreground"}`}>
                            {actionLabels[log.action] ?? log.action}
                          </span>
                          <Badge variant="outline" className="text-[10px]">{log.resource}</Badge>
                          {log.resourceId && (
                            <span className="text-[10px] text-muted-foreground">{log.resourceId}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{log.description}</p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
                          {log.ipAddress && (
                            <p className="text-[10px] text-muted-foreground">{log.ipAddress}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({totalCount} entries)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Detail Drawer */}
        {selectedEntry && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedEntry(null)} />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l bg-background shadow-xl animate-slide-in-right overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Audit Entry Details</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedEntry(null)} aria-label="Close details">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Action badge + severity */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${actionColors[selectedEntry.action] ?? "bg-muted text-muted-foreground"}`}>
                    {actionLabels[selectedEntry.action] ?? selectedEntry.action}
                  </span>
                  <Badge variant="outline">{selectedEntry.resource}</Badge>
                  <span className={`inline-flex items-center gap-1 text-xs ${
                    (actionSeverity[selectedEntry.action] ?? "info") === "critical"
                      ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    <span className={`inline-block h-2 w-2 rounded-full ${
                      (actionSeverity[selectedEntry.action] ?? "info") === "critical" ? "bg-red-500" :
                      (actionSeverity[selectedEntry.action] ?? "info") === "warning" ? "bg-amber-500" : "bg-blue-500"
                    }`} />
                    Severity: {(actionSeverity[selectedEntry.action] ?? "info").charAt(0).toUpperCase() + (actionSeverity[selectedEntry.action] ?? "info").slice(1)}
                  </span>
                </div>

                {/* Description */}
                <div className="rounded-lg border p-4">
                  <p className="text-sm">{selectedEntry.description}</p>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Entry Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Entry ID</p>
                      <p className="text-sm font-mono font-medium mt-0.5">{selectedEntry.id}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-medium mt-0.5">{new Date(selectedEntry.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">User Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">User</p>
                      </div>
                      <p className="text-sm font-medium mt-0.5">{selectedEntry.userName}</p>
                      <p className="text-xs text-muted-foreground">{selectedEntry.userId}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Role</p>
                      </div>
                      <p className="text-sm font-medium mt-0.5 capitalize">{selectedEntry.userRole}</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Resource</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Resource</p>
                      </div>
                      <p className="text-sm font-medium mt-0.5">{selectedEntry.resource}</p>
                    </div>
                    {selectedEntry.resourceId && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Resource ID</p>
                        <p className="text-sm font-mono font-medium mt-0.5">{selectedEntry.resourceId}</p>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Network</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedEntry.ipAddress && (
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">IP Address</p>
                        </div>
                        <p className="text-sm font-mono font-medium mt-0.5">{selectedEntry.ipAddress}</p>
                      </div>
                    )}
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Relative Time</p>
                      <p className="text-sm font-medium mt-0.5">{formatRelativeTime(selectedEntry.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
