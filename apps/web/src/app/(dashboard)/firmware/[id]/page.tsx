"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package,
  ArrowLeft,
  AlertTriangle,
  HardDrive,
  Calendar,
  FileText,
  Hash,
  Circle,
  User,
  Rocket,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";
import { formatDateTime } from "@sentience/utils";
import {
  useFirmwarePackage,
  useDeprecateFirmwarePackage,
  useActivateFirmwarePackage,
} from "@/hooks/use-firmware";

// ─── Status Badge Config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400", dotColor: "bg-emerald-500" },
  deprecated: { label: "Deprecated", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400", dotColor: "bg-amber-500" },
};

export default function FirmwarePackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeprecateDialog, setShowDeprecateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  const { data: pkg, isLoading, isError, refetch } = useFirmwarePackage(id);
  const deprecateMutation = useDeprecateFirmwarePackage();
  const activateMutation = useActivateFirmwarePackage();

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleDeprecate = () => {
    deprecateMutation.mutate(id, {
      onSuccess: () => setShowDeprecateDialog(false),
    });
  };

  const handleActivate = () => {
    activateMutation.mutate(id, {
      onSuccess: () => setShowActivateDialog(false),
    });
  };

  // ─── Loading State ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading..." description="Firmware package detail" />
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Error / Not Found State ──────────────────────────────────────────────

  if (isError || !pkg) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Firmware Package"
          description="Package detail"
          actions={
            <Button variant="ghost" onClick={() => router.push("/firmware")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={AlertTriangle}
              title="Package not found"
              description="This firmware package could not be loaded. It may have been deleted."
              action={{ label: "Retry", onClick: () => refetch() }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[pkg.status] ?? STATUS_CONFIG.active;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${pkg.name} v${pkg.version}`}
        description="Firmware package detail and rollout history"
        actions={
          <div className="flex items-center gap-2">
            {pkg.status === "active" ? (
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => setShowDeprecateDialog(true)}
                disabled={deprecateMutation.isPending}
              >
                {deprecateMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                )}
                Deprecate
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={() => setShowActivateDialog(true)}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                )}
                Reactivate
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.push("/firmware")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      {/* Package Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Package Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" /> Version
              </dt>
              <dd className="font-medium mt-0.5">{pkg.version}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground flex items-center gap-1">
                <Circle className={`h-3.5 w-3.5 ${statusCfg.dotColor}`} /> Status
              </dt>
              <dd className="mt-0.5">
                <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5" /> Device Types
              </dt>
              <dd className="font-medium mt-0.5 flex gap-1 flex-wrap">
                {pkg.deviceType.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Created
              </dt>
              <dd className="font-medium mt-0.5">{formatDateTime(pkg.createdAt)}</dd>
            </div>
            {pkg.createdBy && (
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Created By
                </dt>
                <dd className="font-medium mt-0.5">{pkg.createdBy}</dd>
              </div>
            )}
            {pkg.fileHash && (
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> File Hash
                </dt>
                <dd className="font-mono text-xs mt-0.5 break-all">{pkg.fileHash}</dd>
              </div>
            )}
            {pkg.fileSize !== null && (
              <div>
                <dt className="text-muted-foreground">File Size</dt>
                <dd className="font-medium mt-0.5">
                  {pkg.fileSize > 1024 * 1024
                    ? `${(pkg.fileSize / (1024 * 1024)).toFixed(1)} MB`
                    : `${pkg.fileSize} bytes`}
                </dd>
              </div>
            )}
          </dl>

          {/* Metadata section */}
          {pkg.metadata && Object.keys(pkg.metadata).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-3">Metadata</h4>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {Object.entries(pkg.metadata).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground text-xs uppercase tracking-wider">{key}</dt>
                    <dd className="font-medium mt-0.5">
                      {typeof value === "object" && value !== null
                        ? JSON.stringify(value)
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {pkg.releaseNotes && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <FileText className="h-4 w-4" /> Release Notes
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {pkg.releaseNotes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage / Rollout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Rollout History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Rocket}
            title="No rollouts yet"
            description="Rollout history for this firmware package will appear here once rollouts reference it."
          />
        </CardContent>
      </Card>

      {/* Deprecate Confirmation Dialog */}
      <AlertDialog open={showDeprecateDialog} onOpenChange={setShowDeprecateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-amber-500" />
              Deprecate Package
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deprecate <strong>{pkg.name} v{pkg.version}</strong>?
              <br />
              Deprecated packages cannot be used for new rollouts but existing rollouts will continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeprecate}
              className="bg-amber-600 text-white hover:bg-amber-700"
              disabled={deprecateMutation.isPending}
            >
              {deprecateMutation.isPending ? "Deprecating..." : "Deprecate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-emerald-500" />
              Reactivate Package
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate <strong>{pkg.name} v{pkg.version}</strong>?
              <br />
              Reactivated packages become available for new rollouts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending ? "Reactivating..." : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
