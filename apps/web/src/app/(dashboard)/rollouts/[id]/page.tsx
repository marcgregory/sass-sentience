"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Rocket,
  ArrowLeft,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Play,
  Ban,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  StopCircle,
} from "lucide-react";
import { formatRelativeTime, formatDateTime, cn } from "@sentience/utils";
import {
  useRollout,
  useRolloutDevices,
  useStartRollout,
  useCancelRollout,
  useRetryRollout,
} from "@/hooks/use-firmware";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "outline", icon: Clock },
  running: { label: "Running", variant: "default", icon: Loader2 },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Ban },
};

const DEVICE_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pending", variant: "outline", icon: Clock },
  running: { label: "Running", variant: "default", icon: Loader2 },
  succeeded: { label: "Succeeded", variant: "secondary", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  skipped: { label: "Skipped", variant: "outline", icon: SkipForward },
  cancelled: { label: "Cancelled", variant: "outline", icon: StopCircle },
};

const DEVICE_STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function RolloutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [devicePage, setDevicePage] = useState(1);
  const [deviceStatusFilter, setDeviceStatusFilter] = useState("");
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: rollout, isLoading, isError, refetch } = useRollout(id);
  const { data: deviceData, isLoading: devicesLoading, refetch: refetchDevices } = useRolloutDevices(id, {
    page: devicePage,
    limit: PAGE_SIZE,
    status: (deviceStatusFilter as "pending" | "running" | "succeeded" | "failed" | "skipped" | "cancelled") || undefined,
  });

  const startMutation = useStartRollout();
  const cancelMutation = useCancelRollout();
  const retryMutation = useRetryRollout();

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleStart = () => {
    startMutation.mutate(id, { onSuccess: () => setConfirmStart(false) });
  };

  const handleCancel = () => {
    cancelMutation.mutate(id, { onSuccess: () => setConfirmCancel(false) });
  };

  const handleRetry = () => {
    retryMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading..." description="Rollout detail" />
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !rollout) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rollout"
          description="Rollout detail"
          actions={
            <Button variant="ghost" onClick={() => router.push("/rollouts")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={AlertTriangle}
              title="Rollout not found"
              description="This rollout could not be loaded. It may have been deleted."
              action={{ label: "Retry", onClick: () => refetch() }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[rollout.status] ?? STATUS_CONFIG.draft;
  const progress = rollout.deviceCount > 0
    ? Math.round(((rollout.completedCount + rollout.failedCount) / rollout.deviceCount) * 100)
    : 0;

  const deviceTotalPages = deviceData ? Math.ceil(deviceData.pagination.total / PAGE_SIZE) : 0;
  const hasFailedDevices = rollout.failedCount > 0;
  const canStart = rollout.status === "draft";
  const canCancel = rollout.status === "running" || rollout.status === "draft";
  const canRetry = hasFailedDevices && (rollout.status === "running" || rollout.status === "completed" || rollout.status === "failed");

  return (
    <div className="space-y-6">
      <PageHeader
        title={rollout.name}
        description="Rollout detail and device status"
        actions={
          <Button variant="ghost" onClick={() => router.push("/rollouts")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Summary Card */}
      <Card>
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <Badge variant={statusCfg.variant}>
                  <statusCfg.icon className={cn(
                    "mr-1 h-3.5 w-3.5",
                    rollout.status === "running" && "animate-spin",
                  )} />
                  {statusCfg.label}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Firmware</dt>
              <dd className="mt-1 font-medium">{rollout.firmwareName ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Target Group</dt>
              <dd className="mt-1 font-medium">{rollout.targetGroupName ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="mt-1 font-medium">{formatDateTime(rollout.createdAt)}</dd>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">
                {rollout.completedCount} succeeded, {rollout.failedCount} failed / {rollout.deviceCount} total
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${rollout.deviceCount > 0 ? (rollout.completedCount / rollout.deviceCount) * 100 : 0}%` }}
              />
              <div
                className="bg-red-500 h-full transition-all"
                style={{ width: `${rollout.deviceCount > 0 ? (rollout.failedCount / rollout.deviceCount) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{progress}% complete</span>
              {rollout.startedAt && <span>Started {formatRelativeTime(rollout.startedAt)}</span>}
              {rollout.completedAt && <span>Completed {formatRelativeTime(rollout.completedAt)}</span>}
              {rollout.cancelledAt && <span>Cancelled {formatRelativeTime(rollout.cancelledAt)}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {canStart && (
          <AlertDialog open={confirmStart} onOpenChange={setConfirmStart}>
            <AlertDialogTrigger asChild>
              <Button>
                <Play className="mr-2 h-4 w-4" />
                Start Rollout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start Rollout</AlertDialogTitle>
                <AlertDialogDescription>
                  This will begin distributing firmware to {rollout.deviceCount} device(s).
                  This action cannot be undone once devices start updating.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStart}>
                  {startMutation.isPending ? "Starting..." : "Start Rollout"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {canCancel && (
          <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Ban className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Rollout</AlertDialogTitle>
                <AlertDialogDescription>
                  This will cancel the rollout. Pending devices will be marked as cancelled.
                  Devices already in progress may continue. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Back</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {cancelMutation.isPending ? "Cancelling..." : "Cancel Rollout"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {canRetry && (
          <Button
            variant="secondary"
            onClick={handleRetry}
            disabled={retryMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {retryMutation.isPending ? "Retrying..." : `Retry Failed (${rollout.failedCount})`}
          </Button>
        )}
      </div>

      {/* Device Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Device Status</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Device status filter tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            {DEVICE_STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={deviceStatusFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => { setDeviceStatusFilter(f.value); setDevicePage(1); }}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {devicesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : deviceData && deviceData.data.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No devices"
              description={
                deviceStatusFilter
                  ? "No devices match the selected status filter."
                  : "No devices are part of this rollout."
              }
            />
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium">Device</th>
                      <th className="text-left py-2 px-3 font-medium">Serial</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Error</th>
                      <th className="text-left py-2 px-3 font-medium">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceData?.data.map((device) => {
                      const devStatusCfg = DEVICE_STATUS_CONFIG[device.status] ?? DEVICE_STATUS_CONFIG.pending;
                      return (
                        <tr key={device.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium">{device.deviceName ?? "Unknown"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{device.deviceSerial ?? "—"}</td>
                          <td className="py-2 px-3">
                            <Badge variant={devStatusCfg.variant}>
                              <devStatusCfg.icon className={cn(
                                "mr-1 h-3 w-3",
                                device.status === "running" && "animate-spin",
                              )} />
                              {devStatusCfg.label}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">
                            {device.errorMessage ?? "—"}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {device.startedAt ? formatRelativeTime(device.startedAt) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {deviceTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={devicePage <= 1}
                    onClick={() => setDevicePage(devicePage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {devicePage} of {deviceTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={devicePage >= deviceTotalPages}
                    onClick={() => setDevicePage(devicePage + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
