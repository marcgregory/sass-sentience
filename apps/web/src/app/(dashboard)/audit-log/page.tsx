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
} from "lucide-react";
import type { AuditAction } from "@sentience/types";

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400",
  login: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400",
  logout: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  export: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400",
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

export default function AuditLogPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { entries } = useAuditStore();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [page, setPage] = useState(0);
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
      return matchesSearch && matchesAction;
    });
  }, [entries, search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  const handleCSVExport = () => {
    const headers = ["ID", "User", "Action", "Resource", "Description", "Timestamp"];
    const rows = filtered.map((e) => [
      e.id,
      e.userName,
      e.action,
      e.resource,
      e.description,
      new Date(e.createdAt).toISOString(),
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
                Export CSV
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
            {actionTypes.map((a) => (
              <option key={a} value={a}>{actionLabels[a] ?? a}</option>
            ))}
          </select>
        </div>

        {/* Audit entries */}
        <div className="rounded-lg border">
          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No audit entries found</p>
              <p className="text-xs text-muted-foreground">
                {search || actionFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "No audit activity recorded yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {paged.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
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
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
                    {log.ipAddress && (
                      <p className="text-[10px] text-muted-foreground">{log.ipAddress}</p>
                    )}
                  </div>
                </div>
              ))}
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
      </div>
    </RequirePermission>
  );
}
