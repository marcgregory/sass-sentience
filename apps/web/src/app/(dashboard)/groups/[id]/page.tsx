"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-dot";
import {
  Card,
  CardContent,
  CardDescription,
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
  ArrowLeft,
  FolderKanban,
  Monitor,
  Battery,
  Wifi,
  Thermometer,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Check,
  X as XIcon,
  HardDrive,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  formatRelativeTime,
  deriveDeviceHealth,
} from "@sentience/utils";
import { useDeviceGroup, useUpdateDeviceGroup, useDeleteDeviceGroup, useGroupDevices } from "@/hooks/use-device-groups";
import { useDevices } from "@/hooks/use-devices";
import type { UpdateDeviceGroupPayload } from "@/lib/device-groups";
import type { GroupDeviceItem } from "@/lib/device-groups";
import type { DeviceStatus, StatusReason } from "@sentience/types";
import type { DeviceEntry } from "@sentience/utils";
import type { DeviceListRow } from "@/hooks/use-devices";

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatUptime(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

/**
 * Map a GroupDeviceItem (from the server-scoped group devices API)
 * to the DeviceListRow format used by the table renderer.
 */
function mapGroupDeviceToRow(d: GroupDeviceItem): DeviceListRow {
  const entry: DeviceEntry = {
    deviceId: d.id,
    deviceType: d.type,
    status: d.status as DeviceStatus,
    telemetry:
      d.battery != null && d.signalStrength != null && d.temperature != null
        ? {
            battery: d.battery,
            voltage: 0,
            temperature: d.temperature,
            signalStrength: d.signalStrength,
            timestamp: d.lastHeartbeat ?? d.updatedAt ?? new Date().toISOString(),
          }
        : null,
    lastSeen: d.lastHeartbeat ?? d.updatedAt ?? new Date().toISOString(),
    siteId: d.siteId,
    siteName: d.siteName ?? undefined,
    estateName: d.estateName ?? undefined,
  };
  const health = deriveDeviceHealth(entry);
  return {
    id: d.id,
    name: d.name,
    serial: d.serialNumber,
    type: d.type.charAt(0).toUpperCase() + d.type.slice(1),
    status: health.status,
    reasons: health.reasons,
    battery: d.battery,
    signal: d.signalStrength ?? 0,
    temp: d.temperature ?? 0,
    site: d.siteName ?? `Site ${d.siteId.slice(0, 8)}`,
    lastSeen: d.lastHeartbeat ?? d.updatedAt ?? new Date().toISOString(),
    uptime: d.uptime,
    tags: d.tags ?? [],
  };
}

const PAGE_SIZE = 20;

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const groupId = params.id;

  const { data: group, isLoading, isError, error } = useDeviceGroup(groupId);
  const updateGroup = useUpdateDeviceGroup();
  const deleteGroup = useDeleteDeviceGroup();

  // ── Group Devices (server-scoped, paginated) ──────────────────────────
  // Phase B.1 — uses the new backend query instead of client-side filtering.
  const [devicePage, setDevicePage] = useState(1);
  const [deviceSearch, setDeviceSearch] = useState("");

  const groupDevicesQuery = useGroupDevices(groupId, {
    page: devicePage,
    limit: PAGE_SIZE,
    search: deviceSearch.trim() || undefined,
  });

  const groupDeviceRows = useMemo<DeviceListRow[]>(() => {
    if (!groupDevicesQuery.data) return [];
    return groupDevicesQuery.data.data.map(mapGroupDeviceToRow);
  }, [groupDevicesQuery.data]);

  const totalGroupDevices = groupDevicesQuery.data?.pagination?.total ?? 0;
  const totalGroupPages = groupDevicesQuery.data?.pagination?.totalPages ?? 0;

  // ── Add Devices Dialog (will migrate to server search in Phase B.4) ──
  // TODO(Phase B.4): Replace useDevices(1) with a dedicated "search available
  // devices" endpoint that excludes already-assigned devices server-side.
  const { devices: allDevices, isLoading: allDevicesLoading } = useDevices(1);
  const [addDevicesOpen, setAddDevicesOpen] = useState(false);
  const [addDeviceSearch, setAddDeviceSearch] = useState("");

  // Devices not in group — candidate list for adding
  const devicesNotInGroup = useMemo(() => {
    if (!group) return [];
    const groupDeviceIds = new Set(group.deviceIds);
    return allDevices.filter((d) => !groupDeviceIds.has(d.id));
  }, [group, allDevices]);

  // Filter candidates by search
  const candidateDevices = useMemo(() => {
    if (!addDeviceSearch.trim()) return devicesNotInGroup;
    const q = addDeviceSearch.toLowerCase();
    return devicesNotInGroup.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.serial.toLowerCase().includes(q),
    );
  }, [devicesNotInGroup, addDeviceSearch]);

  // Redirect (for table-level only — add-device dialog uses addDeviceSearch)
  const handleSearchChange = (value: string) => {
    setDeviceSearch(value);
    setDevicePage(1); // reset to first page on new search
  };

  // ── Edit dialog state ─────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleEdit = () => {
    if (!group || !editName.trim()) return;
    const payload: UpdateDeviceGroupPayload = {
      name: editName.trim(),
      description: editDescription.trim() || null,
    };
    updateGroup.mutate(
      { id: groupId, payload },
      { onSuccess: () => setEditOpen(false) },
    );
  };

  const handleDelete = () => {
    deleteGroup.mutate(groupId, {
      onSuccess: () => router.push("/groups"),
    });
  };

  const handleAddDevice = (deviceId: string) => {
    if (!group) return;
    const updatedIds = [...group.deviceIds, deviceId];
    updateGroup.mutate({ id: groupId, payload: { deviceIds: updatedIds } });
  };

  const handleRemoveDevice = (deviceId: string) => {
    if (!group) return;
    const updatedIds = group.deviceIds.filter((id) => id !== deviceId);
    updateGroup.mutate({ id: groupId, payload: { deviceIds: updatedIds } });
  };

  // ── Init edit dialog ─────────────────────────────────────────────────

  const openEditDialog = () => {
    if (!group) return;
    setEditName(group.name);
    setEditDescription(group.description ?? "");
    setEditOpen(true);
  };

  // ═══ Loading State ════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ═══ Error State ══════════════════════════════════════════════════════

  if (isError) {
    return (
      <div className="animate-fade-in">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2"
          onClick={() => router.push("/groups")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Button>
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load group"
          description={
            error instanceof Error
              ? error.message
              : "The API server may be offline."
          }
          action={{
            label: "Retry",
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  // ═══ Not Found ════════════════════════════════════════════════════════

  if (!group) {
    return (
      <div className="animate-fade-in">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2"
          onClick={() => router.push("/groups")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Button>
        <EmptyState
          icon={HardDrive}
          title="Group not found"
          description={`No device group matches ID "${groupId}". It may have been deleted or the ID is incorrect.`}
          action={{
            label: "View All Groups",
            onClick: () => router.push("/groups"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => router.push("/groups")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      <PageHeader
        title={group.name}
        description={group.description ?? `${group.deviceCount} device${group.deviceCount !== 1 ? "s" : ""} • Created ${formatRelativeTime(group.createdAt)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditDialog} className="gap-2">
              Edit Group
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Device Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete <strong>{group.name}</strong>? This action cannot be undone. Devices in this group will not be affected.
                    {group.deviceCount > 0 && (
                      <span className="block mt-2 text-amber-600 dark:text-amber-400">
                        This group contains {group.deviceCount} device{group.deviceCount !== 1 ? "s" : ""}.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteGroup.isPending}
                  >
                    {deleteGroup.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device Group</DialogTitle>
            <DialogDescription>Update the group name or description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">Name</label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-desc" className="text-sm font-medium">Description</label>
              <textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || updateGroup.isPending}>
              {updateGroup.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{group.deviceCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setAddDevicesOpen(true)}
              disabled={devicesNotInGroup.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add Devices
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Add Devices Dialog */}
      {/* TODO(Phase B.4): Replace this client-side candidate list with a
          server-side search endpoint that excludes already-assigned devices. */}
      <Dialog open={addDevicesOpen} onOpenChange={setAddDevicesOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Devices</DialogTitle>
            <DialogDescription>
              Select devices to add to <strong>{group.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search devices to add"
              placeholder="Search by name or serial..."
              value={addDeviceSearch}
              onChange={(e) => setAddDeviceSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {candidateDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {addDeviceSearch ? "No devices match your search." : "All devices are already in this group."}
              </p>
            ) : (
              candidateDevices.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium truncate">{d.name}</span>
                    <span className="text-muted-foreground text-xs font-mono">{d.serial}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => handleAddDevice(d.id)}
                    disabled={updateGroup.isPending}
                    aria-label={`Add ${d.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDevicesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Group Devices Section ═══════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Devices in this Group</h2>
          {!groupDevicesQuery.isLoading && totalGroupDevices > 0 && (
            <span className="text-sm text-muted-foreground">
              {totalGroupDevices} device{totalGroupDevices !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Server-side search for group devices */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search devices in group"
            placeholder="Search devices in this group..."
            value={deviceSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Group Devices: Loading */}
        {groupDevicesQuery.isLoading && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Serial</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Battery</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Signal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Seen</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Uptime</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-16"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full max-w-[100px] animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Group Devices: Error */}
        {groupDevicesQuery.isError && (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex items-center gap-4 p-6">
              <AlertTriangle className="h-8 w-8 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">Failed to load group devices</CardTitle>
                <CardDescription className="mt-0.5">
                  {groupDevicesQuery.error instanceof Error
                    ? groupDevicesQuery.error.message
                    : "The API server may be offline."}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => groupDevicesQuery.refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Group Devices: Empty */}
        {!groupDevicesQuery.isLoading && !groupDevicesQuery.isError && groupDeviceRows.length === 0 && (
          <EmptyState
            icon={HardDrive}
            title={deviceSearch ? "No matching devices" : "No devices in this group"}
            description={
              deviceSearch
                ? "No devices match your search. Try a different term."
                : "Add devices to this group to get started."
            }
            action={
              deviceSearch
                ? { label: "Clear Search", onClick: () => handleSearchChange("") }
                : devicesNotInGroup.length > 0
                  ? { label: "Add Devices", onClick: () => setAddDevicesOpen(true) }
                  : undefined
            }
          />
        )}

        {/* Group Devices: Table */}
        {!groupDevicesQuery.isLoading && !groupDevicesQuery.isError && groupDeviceRows.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Serial</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Battery</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Signal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Seen</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Uptime</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {groupDeviceRows.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/devices/${d.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{d.serial}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} reasons={d.reasons} />
                      </td>
                      <td className="px-4 py-3 text-sm">{d.battery != null ? `${d.battery}%` : "N/A"}</td>
                      <td className="px-4 py-3 text-sm">{d.signal !== 0 ? `${d.signal} dBm` : "N/A"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(d.lastSeen)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                        {formatUptime(d.uptime)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDevice(d.id);
                          }}
                          disabled={updateGroup.isPending}
                          aria-label={`Remove ${d.name} from group`}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalGroupPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Page {devicePage} of {totalGroupPages} ({totalGroupDevices} device{totalGroupDevices !== 1 ? "s" : ""})
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={devicePage <= 1}
                    onClick={() => setDevicePage((p) => Math.max(1, p - 1))}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={devicePage >= totalGroupPages}
                    onClick={() => setDevicePage((p) => p + 1)}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
