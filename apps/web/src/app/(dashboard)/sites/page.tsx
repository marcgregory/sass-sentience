"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/permissions";
import { useSites, useCreateSite, useDeleteSite } from "@/hooks/use-sites";
import { useEstates } from "@/hooks/use-estates";
import type { CreateSitePayload } from "@/lib/sites";
import {
  Plus,
  MapPin,
  Monitor,
  Users,
  Building2,
  Search,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Filter,
} from "lucide-react";

// ─── Loading Skeleton ────────────────────────────────────────────────────

function SitesPageSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
              <div className="h-4 w-36 rounded bg-muted animate-pulse" />
              <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-14 rounded-lg bg-muted animate-pulse" />
                <div className="h-14 rounded-lg bg-muted animate-pulse" />
                <div className="h-14 rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Create Site Dialog ─────────────────────────────────────────────────

function CreateSiteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createMutation = useCreateSite();
  const { data: estatesData } = useEstates({ limit: 200 });
  const estateOptions = estatesData?.data ?? [];

  const [name, setName] = useState("");
  const [estateId, setEstateId] = useState("");
  const [address, setAddress] = useState("");
  const [buildingCount, setBuildingCount] = useState(1);
  const [floorCount, setFloorCount] = useState(1);
  const [roomCount, setRoomCount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const isValid = name.trim() && estateId && address.trim();

  const resetForm = () => {
    setName("");
    setEstateId("");
    setAddress("");
    setBuildingCount(1);
    setFloorCount(1);
    setRoomCount(1);
    setError(null);
  };

  const handleCreate = async () => {
    if (!isValid) return;
    setError(null);
    try {
      const payload: CreateSitePayload = {
        name: name.trim(),
        estateId,
        address: address.trim(),
        buildingCount,
        floorCount,
        roomCount,
      };
      await createMutation.mutateAsync(payload);
      resetForm();
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Failed to create site");
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Create Site</h3>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Site Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Building A - Riverside"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Estate</label>
            <select
              value={estateId}
              onChange={(e) => setEstateId(e.target.value)}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select an estate...</option>
              {estateOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="123 Riverside Drive"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buildings</label>
              <input
                type="number"
                min={1}
                value={buildingCount}
                onChange={(e) => setBuildingCount(parseInt(e.target.value) || 1)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Floors</label>
              <input
                type="number"
                min={1}
                value={floorCount}
                onChange={(e) => setFloorCount(parseInt(e.target.value) || 1)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rooms</label>
              <input
                type="number"
                min={1}
                value={roomCount}
                onChange={(e) => setRoomCount(parseInt(e.target.value) || 1)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!isValid || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Site
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Delete Confirmation Dialog ─────────────────────────────────────────

function DeleteSiteDialog({
  siteName,
  siteId,
  open,
  onClose,
}: {
  siteName: string;
  siteId: string;
  open: boolean;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteSite();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteMutation.mutateAsync(siteId);
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Failed to delete site");
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Delete Site</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{siteName}</strong>? This action cannot be undone.
            </p>
          </div>
        </div>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────

export default function SitesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canManage = hasPermission(currentUser?.role, "sites", "manage");

  const [searchQuery, setSearchQuery] = useState("");
  const [estateFilter, setEstateFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  // Fetch estates for the filter dropdown
  const { data: estatesData } = useEstates({ limit: 200 });
  const estateOptions = estatesData?.data ?? [];

  // Fetch sites with optional estate filter
  const {
    data: sitesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useSites({
    estate_id: estateFilter || undefined,
    search: searchQuery || undefined,
    limit: 100,
  });

  const sites = sitesData?.data ?? [];
  const total = sitesData?.pagination?.total ?? 0;

  // Build estate name map for quick lookup
  const estateNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of estateOptions) {
      map.set(e.id, e.name);
    }
    return map;
  }, [estateOptions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sites"
        description="View and manage all monitored sites"
        actions={
          canManage && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Add Site
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search sites"
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Estate filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={estateFilter}
            onChange={(e) => setEstateFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by estate"
          >
            <option value="">All Estates</option>
            {estateOptions.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {estatesData && estateOptions.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {sites.length} site{sites.length !== 1 ? "s" : ""}
            {estateFilter ? "" : ` across ${estateOptions.length} estate${estateOptions.length !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      {/* ─── Loading State ──────────────────────────────────────────── */}
      {isLoading && <SitesPageSkeleton />}

      {/* ─── Error State ────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm font-medium">Failed to load sites</p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Could not reach the server."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Empty State ────────────────────────────────────────────── */}
      {!isLoading && !isError && sites.length === 0 && (
        <EmptyState
          icon={MapPin}
          title={searchQuery || estateFilter ? "No matching sites" : "No sites found"}
          description={
            searchQuery || estateFilter
              ? "Try adjusting your search or filter criteria."
              : "No sites are registered yet. Add a site to get started."
          }
          action={
            searchQuery || estateFilter
              ? { label: "Clear Filters", onClick: () => { setSearchQuery(""); setEstateFilter(""); } }
              : canManage
                ? { label: "Add Site", onClick: () => setShowCreate(true) }
                : undefined
          }
        />
      )}

      {/* ─── Site Grid ──────────────────────────────────────────────── */}
      {!isLoading && !isError && sites.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => {
            const healthPct = Math.round(site.healthScore);
            const displayEstate = site.estateName ?? estateNameMap.get(site.estateId) ?? "Unknown";
            return (
              <Card key={site.id} className="hover:border-primary/50 transition-colors group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{site.name}</CardTitle>
                      <CardDescription className="truncate">{displayEstate}</CardDescription>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ml-3">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Health Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Health</span>
                      <span>{healthPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          healthPct >= 98 ? "bg-emerald-500" : healthPct >= 90 ? "bg-blue-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${healthPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-sm font-medium">{site.deviceCount}</p>
                      <p className="text-xs text-muted-foreground">Devices</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-sm font-medium text-emerald-600">{site.onlineCount}</p>
                      <p className="text-xs text-muted-foreground">Online</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <p className="text-sm font-medium text-red-600">{site.deviceCount - site.onlineCount}</p>
                      <p className="text-xs text-muted-foreground">Issues</p>
                    </div>
                  </div>

                  {/* Delete Button (admin only) */}
                  {canManage && (
                    <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting({ id: site.id, name: site.name });
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Count */}
      {!isLoading && !isError && sites.length > 0 && total > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {sites.length} of {total} site{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Dialogs */}
      <CreateSiteDialog open={showCreate} onClose={() => setShowCreate(false)} />
      {deleting && (
        <DeleteSiteDialog
          siteName={deleting.name}
          siteId={deleting.id}
          open={!!deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
