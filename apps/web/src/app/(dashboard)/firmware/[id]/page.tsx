"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Package,
  ArrowLeft,
  AlertTriangle,
  HardDrive,
  Calendar,
  FileText,
  Hash,
} from "lucide-react";
import { formatDateTime } from "@sentience/utils";
import { useFirmwarePackage } from "@/hooks/use-firmware";

export default function FirmwarePackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: pkg, isLoading, isError, refetch } = useFirmwarePackage(id);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${pkg.name} v${pkg.version}`}
        description="Firmware package detail and rollout history"
        actions={
          <Button variant="ghost" onClick={() => router.push("/firmware")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

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

      {/* Rollout history placeholder — to be built in Phase D */}
      <Card>
        <CardHeader>
          <CardTitle>Rollout History</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Package}
            title="No rollouts yet"
            description="Rollout history for this firmware package will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
