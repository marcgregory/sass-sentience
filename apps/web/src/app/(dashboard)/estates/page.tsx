"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/permissions";
import { useEstates, useCreateEstate, useDeleteEstate } from "@/hooks/use-estates";
import { useCustomers } from "@/hooks/use-customers";
import type { CreateEstatePayload } from "@/lib/estates";
import {
  Plus,
  Building2,
  MapPin,
  Monitor,
  AlertTriangle,
  Building,
  Search,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  AlertCircle as AlertCircleIcon,
} from "lucide-react";

// ─── Loading Skeleton ────────────────────────────────────────────────────

function EstatesPageSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-56 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
              </div>
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

// ─── Create Estate Dialog ───────────────────────────────────────────────

function CreateEstateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createMutation = useCreateEstate();
  const { data: customersData } = useCustomers();
  const customerOptions = customersData?.data ?? [];

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentUser = useAuthStore((s) => s.user);
  const needsCustomerSelector = currentUser && !currentUser.customerId;

  const isValid =
    name.trim() &&
    address.trim() &&
    city.trim() &&
    region.trim() &&
    country.trim() &&
    contactName.trim() &&
    contactEmail.trim() &&
    contactPhone.trim() &&
    (!needsCustomerSelector || customerId);

  const resetForm = () => {
    setName("");
    setAddress("");
    setCity("");
    setRegion("");
    setCountry("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setError(null);
  };

  const handleCreate = async () => {
    if (!isValid) return;
    setError(null);
    try {
      const payload: CreateEstatePayload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        region: region.trim(),
        country: country.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        ...(needsCustomerSelector && customerId ? { customerId } : {}),
      };
      await createMutation.mutateAsync(payload);
      resetForm();
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Failed to create estate");
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Create Estate</h3>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Estate Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Riverside Industrial Park"
              autoFocus
            />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Manchester"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Region</label>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="North West"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Country</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="United Kingdom"
            />
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Contact Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Name</label>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium">Contact Phone</label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          {needsCustomerSelector && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a customer...</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!isValid || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Estate
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Delete Confirmation Dialog ─────────────────────────────────────────

function DeleteEstateDialog({
  estateName,
  estateId,
  open,
  onClose,
}: {
  estateName: string;
  estateId: string;
  open: boolean;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteEstate();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteMutation.mutateAsync(estateId);
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Failed to delete estate");
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
            <h3 className="text-lg font-semibold">Delete Estate</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{estateName}</strong>? This action cannot be undone.
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

export default function EstatesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canManage = hasPermission(currentUser?.role, "estates", "manage");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, error, refetch } = useEstates({
    search: searchQuery || undefined,
    limit: 100,
  });

  const estates = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Estates"
        description="Manage your property estates and their security infrastructure"
        actions={
          canManage && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Add Estate
            </Button>
          )
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          aria-label="Search estates"
          placeholder="Search estates..."
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

      {/* ─── Loading State ──────────────────────────────────────────── */}
      {isLoading && <EstatesPageSkeleton />}

      {/* ─── Error State ────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm font-medium">Failed to load estates</p>
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
      {!isLoading && !isError && estates.length === 0 && (
        <EmptyState
          icon={Building}
          title={searchQuery ? "No matching estates" : "No estates found"}
          description={
            searchQuery
              ? "Try adjusting your search query."
              : "No estates are registered yet. Add an estate to get started."
          }
          action={
            searchQuery
              ? { label: "Clear Search", onClick: () => setSearchQuery("") }
              : canManage
                ? { label: "Add Estate", onClick: () => setShowCreate(true) }
                : undefined
          }
        />
      )}

      {/* ─── Estate Grid ───────────────────────────────────────────── */}
      {!isLoading && !isError && estates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {estates.map((estate) => {
            const healthPct = Math.round(estate.healthScore);
            const alertCount = estate.warningCount + estate.faultCount;
            return (
              <Card key={estate.id} className="hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{estate.name}</CardTitle>
                      <CardDescription className="truncate">
                        {estate.address}, {estate.city}
                      </CardDescription>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ml-3">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Health Score Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Health Score</span>
                      <span>{healthPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          healthPct >= 95
                            ? "bg-emerald-500"
                            : healthPct >= 90
                              ? "bg-blue-500"
                              : healthPct >= 80
                                ? "bg-amber-500"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${healthPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm font-medium">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {estate.siteCount}
                      </div>
                      <p className="text-xs text-muted-foreground">Sites</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm font-medium">
                        <Monitor className="h-3 w-3 text-muted-foreground" />
                        {estate.deviceCount}
                      </div>
                      <p className="text-xs text-muted-foreground">Devices</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm font-medium">
                        <AlertTriangle className={`h-3 w-3 ${alertCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                        {alertCount}
                      </div>
                      <p className="text-xs text-muted-foreground">Alerts</p>
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
                          setDeleting({ id: estate.id, name: estate.name });
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
      {!isLoading && !isError && estates.length > 0 && total > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {estates.length} of {total} estate{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Dialogs */}
      <CreateEstateDialog open={showCreate} onClose={() => setShowCreate(false)} />
      {deleting && (
        <DeleteEstateDialog
          estateName={deleting.name}
          estateId={deleting.id}
          open={!!deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
