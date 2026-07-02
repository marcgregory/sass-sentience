"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@sentience/utils";
import { useAuditStore } from "@/stores/audit-store";
import { useAuthStore } from "@/stores/auth-store";
import { RequirePermission } from "@/components/shared/require-permission";
import { hasPermission, ROLE_META } from "@/lib/permissions";
import {
  Filter,
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
} from "lucide-react";
import type { AuditAction } from "@sentience/types";

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

export default function AuditLogPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { entries } = useAuditStore();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<typeof entries[number] | null>(null);
  const perPage = 15;

  const canManage = hasPermission(currentUser?.role, "audit-log", "manage");

  // Get unique action types from entries
  const actionTypes = useMemo(() => {
    const types = new Set(entries.map((e) => e.action));
    return Array.from(types);
  }, [entries]);

  // Filter entries
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch = !search ||
        e.userName.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.resource.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase());

      const matchesAction = actionFilter === "all" || e.action === actionFilter;

      const sev = actionSeverity[e.action] ?? "info";
      const matchesSeverity = severityFilter === "all" || sev === severityFilter;

      return matchesSearch && matchesAction && matchesSeverity;
    });
  }, [entries, search, actionFilter, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  const handleCSVExport = () => {
    const headers = ["ID", "User", "Action", "Resource", "Resource ID", "Description", "Timestamp", "IP Address"];
    const rows = filtered.map((e) => [
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
  };

  const SeverityIndicator = ({ action }: { action: string }) => {
    const sev = actionSeverity[action] ?? "info";
    const color = severityColors[sev] ?? "text-blue-500";
    return (
      <span className={`inline-block h-2 w-2 rounded-full ${color.replace("text-", "bg-")} ${sev === "critical" ? "animate-pulse" : ""}`} title={`Severity: ${sev}`} />
    );
  };

  const severityOptions = [
    { value: "all", label: "All Severities" },
    { value: "critical", label: "Critical" },
    { value: "warning", label: "Warning" },
    { value: "info", label: "Info" },
    { value: "debug", label: "Debug" },
  ];

  return (
    <RequirePermission resource="audit-log" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Audit Log"
          description="Track all system activity and changes"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCSVExport}>
                <Download className="h-4 w-4" />
                Export CSV ({filtered.length})
              </Button>
            </div>
          }
        />

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
            <p className="text-2xl font-bold">{entries.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Filtered</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Unique Users</p>
            <p className="text-2xl font-bold">
              {new Set(entries.map((e) => e.userId)).size}
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
              placeholder="Search audit log..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full rounded-md border bg-background py-2 pl-10 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value as AuditAction | "all"); setPage(0); }}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Actions</option>
            {["create", "update", "delete", "login", "logout", "export", "permission_change", "password_reset", "mfa_change"].map((a) => (
              <option key={a} value={a}>{actionLabels[a] ?? a}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {severityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {(search || actionFilter !== "all" || severityFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setActionFilter("all"); setSeverityFilter("all"); setPage(0); }}
              className="text-xs"
            >
              <XCircle className="h-3.5 w-3.5" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Audit entries */}
        <div className="rounded-lg border">
          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No audit entries found</p>
              <p className="text-xs text-muted-foreground">
                {search || actionFilter !== "all" || severityFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "No audit activity recorded yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {paged.map((log) => {
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
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages} ({filtered.length} entries)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
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
                  <Button variant="ghost" size="icon" onClick={() => setSelectedEntry(null)}>
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
