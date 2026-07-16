"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Rocket,
  Search,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
} from "lucide-react";
import { formatRelativeTime, cn } from "@sentience/utils";
import { useRollouts } from "@/hooks/use-firmware";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "outline", icon: Clock },
  running: { label: "Running", variant: "default", icon: Loader2 },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Ban },
};

export default function RolloutsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = searchParams.get("status") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useRollouts({
    page,
    limit: PAGE_SIZE,
    search: searchQuery || undefined,
    status: (statusFilter as "draft" | "running" | "completed" | "failed" | "cancelled") || undefined,
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status === statusFilter ? "" : status);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.pagination.total / PAGE_SIZE) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Firmware Rollouts"
        description="Manage and monitor firmware deployments across device groups"
        actions={
          <Button onClick={() => router.push("/rollouts/create")}>
            <Rocket className="mr-2 h-4 w-4" />
            New Rollout
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search rollouts..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => handleStatusFilter(key)}
            >
              {key === "running" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <config.icon className="mr-1 h-3.5 w-3.5" />
              )}
              {config.label}
            </Button>
          ))}
          {statusFilter && (
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter("")}>
              Clear
            </Button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4">
                <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load rollouts"
              description="There was an error loading the rollout list. Please try again."
              action={{ label: "Retry", onClick: () => refetch() }}
            />
          </CardContent>
        </Card>
      ) : data && data.data.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Rocket}
              title="No rollouts found"
              description={
                searchQuery || statusFilter
                  ? "No rollouts match your filters. Try different criteria."
                  : "Create your first rollout to start managing firmware deployments."
              }
              action={
                searchQuery || statusFilter
                  ? undefined
                  : { label: "New Rollout", onClick: () => router.push("/rollouts/create") }
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data?.data.map((rollout) => {
              const statusCfg = STATUS_CONFIG[rollout.status] ?? STATUS_CONFIG.draft;
              const progress = rollout.deviceCount > 0
                ? Math.round(((rollout.completedCount + rollout.failedCount) / rollout.deviceCount) * 100)
                : 0;

              return (
                <Card
                  key={rollout.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push(`/rollouts/${rollout.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{rollout.name}</h3>
                          <Badge variant={statusCfg.variant}>
                            <statusCfg.icon className={cn(
                              "mr-1 h-3 w-3",
                              rollout.status === "running" && "animate-spin",
                            )} />
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {rollout.firmwareName ?? "Unknown firmware"}
                          {rollout.targetGroupName ? ` → ${rollout.targetGroupName}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">
                          {rollout.completedCount + rollout.failedCount} / {rollout.deviceCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rollout.startedAt
                            ? `Started ${formatRelativeTime(rollout.startedAt)}`
                            : "Not started"}
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          rollout.status === "completed" ? "bg-emerald-500" :
                          rollout.status === "failed" ? "bg-red-500" :
                          rollout.status === "running" ? "bg-primary" :
                          "bg-muted-foreground/30",
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
