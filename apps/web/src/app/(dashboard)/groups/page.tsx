"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  FolderKanban,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  X,
  HardDrive,
} from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";
import { useDeviceGroups, useCreateDeviceGroup, useDeleteDeviceGroup } from "@/hooks/use-device-groups";
import type { CreateDeviceGroupPayload } from "@/lib/device-groups";

export default function GroupsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data, isLoading, isError, error } = useDeviceGroups();
  const createGroup = useCreateDeviceGroup();
  const deleteGroup = useDeleteDeviceGroup();

  const groups = data?.data ?? [];

  const filteredGroups = searchQuery.trim()
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (g.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : groups;

  const handleCreate = () => {
    if (!newName.trim()) return;
    const payload: CreateDeviceGroupPayload = {
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    };
    createGroup.mutate(payload, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewName("");
        setNewDescription("");
      },
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteGroup.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Device Groups"
        description="Organize devices into groups for easier management"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Device Group</DialogTitle>
                <DialogDescription>
                  Groups are named collections of devices. You can add devices after creating the group.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="group-name" className="text-sm font-medium">
                    Name
                  </label>
                  <input
                    id="group-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Building A Sensors"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="group-desc" className="text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="group-desc"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newName.trim() || createGroup.isPending}
                >
                  {createGroup.isPending ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          aria-label="Search groups"
          placeholder="Search by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="flex items-center gap-4 p-6">
            <AlertTriangle className="h-8 w-8 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Failed to load groups</CardTitle>
              <CardDescription className="mt-0.5">
                {error instanceof Error
                  ? error.message
                  : "The API server may be offline."}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredGroups.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title={searchQuery ? "No matching groups" : "No groups yet"}
          description={
            searchQuery
              ? "No groups match your search. Try a different term."
              : "Create your first device group to start organizing devices."
          }
          action={
            searchQuery
              ? { label: "Clear Search", onClick: () => setSearchQuery("") }
              : { label: "Create Group", onClick: () => setCreateOpen(true) }
          }
        />
      )}

      {/* Group cards grid */}
      {!isLoading && !isError && filteredGroups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => router.push(`/groups/${group.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-muted-foreground shrink-0" />
                    <CardTitle className="text-base">{group.name}</CardTitle>
                  </div>
                  <AlertDialog open={deleteId === group.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(group.id);
                        }}
                        aria-label={`Delete group ${group.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                          }}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={deleteGroup.isPending}
                        >
                          {deleteGroup.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {group.description && (
                  <CardDescription className="line-clamp-2 mt-1">
                    {group.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{group.deviceCount}</strong> device{group.deviceCount !== 1 ? "s" : ""}
                  </span>
                  <span>Created {formatRelativeTime(group.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
