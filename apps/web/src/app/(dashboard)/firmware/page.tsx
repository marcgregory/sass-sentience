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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Circle,
} from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";
import { useFirmwarePackages, useCreateFirmwarePackage, useDeleteFirmwarePackage } from "@/hooks/use-firmware";
import type { CreateFirmwarePackagePayload } from "@/lib/firmware";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "deprecated", label: "Deprecated" },
] as const;

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  active: { variant: "default", label: "Active" },
  deprecated: { variant: "secondary", label: "Deprecated" },
};

export default function FirmwarePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = searchParams.get("status") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // ─── Create form state ────────────────────────────────────────────────────
  const [formName, setFormName] = useState("");
  const [formVersion, setFormVersion] = useState("");
  const [formDeviceTypes, setFormDeviceTypes] = useState("");
  const [formReleaseNotes, setFormReleaseNotes] = useState("");

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useFirmwarePackages({
    page,
    limit: PAGE_SIZE,
    search: searchQuery || undefined,
    status: (statusFilter as "active" | "deprecated") || undefined,
  });

  const createMutation = useCreateFirmwarePackage();
  const deleteMutation = useDeleteFirmwarePackage();

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleCreate = () => {
    if (!formName || !formVersion || !formDeviceTypes) return;

    const payload: CreateFirmwarePackagePayload = {
      name: formName,
      version: formVersion,
      deviceType: formDeviceTypes.split(",").map((t) => t.trim()).filter(Boolean),
      releaseNotes: formReleaseNotes || null,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setCreateOpen(false);
        setFormName("");
        setFormVersion("");
        setFormDeviceTypes("");
        setFormReleaseNotes("");
      },
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
        setDeleteName("");
      },
    });
  };

  const totalPages = data ? Math.ceil(data.pagination.total / PAGE_SIZE) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Firmware Packages"
        description="Manage firmware versions for device updates"
        actions={
          <>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Package
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Firmware Package</DialogTitle>
                  <DialogDescription>
                    Register a new firmware package for device rollout.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <input
                      id="name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Sensor OS"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="version" className="text-sm font-medium">Version</label>
                    <input
                      id="version"
                      value={formVersion}
                      onChange={(e) => setFormVersion(e.target.value)}
                      placeholder="e.g. 2.1.0"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="deviceTypes" className="text-sm font-medium">Device Types</label>
                    <input
                      id="deviceTypes"
                      value={formDeviceTypes}
                      onChange={(e) => setFormDeviceTypes(e.target.value)}
                      placeholder="e.g. temperature, humidity (comma-separated)"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">Release Notes</label>
                    <input
                      id="notes"
                      value={formReleaseNotes}
                      onChange={(e) => setFormReleaseNotes(e.target.value)}
                      placeholder="Optional release notes"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!formName || !formVersion || !formDeviceTypes || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog
              open={!!deleteId}
              onOpenChange={(open) => {
                if (!open) { setDeleteId(null); setDeleteName(""); }
              }}
            >
              <AlertDialogTrigger asChild>
                <span />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete Firmware Package
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete <strong>{deleteName}</strong>?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search firmware packages..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleStatusFilter(opt.value)}
            >
              {opt.value && <Circle className={`mr-1.5 h-2 w-2 fill-current ${opt.value === "active" ? "text-emerald-500" : "text-amber-500"}`} />}
              {opt.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load firmware packages"
              description="There was an error loading the firmware package list. Please try again."
              action={{ label: "Retry", onClick: () => refetch() }}
            />
          </CardContent>
        </Card>
      ) : data && data.data.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Package}
              title="No firmware packages"
              description={
                searchQuery || statusFilter
                  ? "No packages match your filters. Try a different query."
                  : "Create your first firmware package to start managing device updates."
              }
              action={
                searchQuery || statusFilter
                  ? { label: "Clear Filters", onClick: () => { setSearchQuery(""); setStatusFilter(""); } }
                  : { label: "Add Package", onClick: () => setCreateOpen(true) }
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((pkg) => {
              const statusStyle = STATUS_BADGE[pkg.status] ?? STATUS_BADGE.active;
              return (
                <Card
                  key={pkg.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push(`/firmware/${pkg.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2 min-w-0">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{pkg.name}</span>
                      </CardTitle>
                      <Badge variant={statusStyle.variant} className="shrink-0 text-[10px] px-1.5 py-0">
                        {statusStyle.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Version: <span className="font-medium text-foreground">{pkg.version}</span></p>
                      <p>
                        Devices:{" "}
                        <span className="font-medium text-foreground">
                          {pkg.deviceType.join(", ")}
                        </span>
                      </p>
                      <p>Created {formatRelativeTime(pkg.createdAt)}</p>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(pkg.id);
                          setDeleteName(`${pkg.name} v${pkg.version}`);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
