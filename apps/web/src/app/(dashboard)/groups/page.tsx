"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Archive,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";
import { formatRelativeTime, cn } from "@sentience/utils";
import { useDeviceGroups, useCreateDeviceGroup, useDeleteDeviceGroup, useArchiveGroup, useRestoreGroup } from "@/hooks/use-device-groups";
import type { CreateDeviceGroupPayload } from "@/lib/device-groups";

// ─── Constants ────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type ArchiveFilter = "active" | "archived" | "all";

const ARCHIVE_FILTERS: { value: ArchiveFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

export default function GroupsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const initialSearch = searchParams.get("search") ?? "";
  const initialArchived = (searchParams.get("archived") as ArchiveFilter) ?? "active";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [archivedFilter, setArchivedFilter] = useState<ArchiveFilter>(initialArchived);
  const [page, setPage] = useState(initialPage);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiveName, setArchiveName] = useState("");
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data, isLoading, isError, error } = useDeviceGroups({
    search: searchQuery || undefined,
    page,
    limit: PAGE_SIZE,
    archived: archivedFilter === "all" ? "all" : archivedFilter === "archived" ? "true" : "false",
  });
  const createGroup = useCreateDeviceGroup();
  const deleteGroup = useDeleteDeviceGroup();
  const archiveGroup = useArchiveGroup();
  const restoreGroup = useRestoreGroup();

  const groups = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 0;

  // ── URL sync ─────────────────────────────────────────────────────────

  const updateUrl = useCallback((p: number, s: string, a: ArchiveFilter) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (s) params.set("search", s);
    if (a !== "active") params.set("archived", a);
    const qs = params.toString();
    router.replace(`/groups${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    updateUrl(1, value, archivedFilter);
  };

  const handleArchiveFilter = (value: ArchiveFilter) => {
    setArchivedFilter(value);
    setPage(1);
    updateUrl(page, searchQuery, value);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(newPage, searchQuery, archivedFilter);
  };

  // ── Handlers ──────────────────────────────────────────────────────────

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

  const handleArchive = () => {
    if (!archiveId) return;
    archiveGroup.mutate(archiveId, {
      onSuccess: () => { setArchiveId(null); setArchiveName(""); },
    });
  };

  const handleRestore = () => {
    if (!restoreId) return;
    restoreGroup.mutate(restoreId, {
      onSuccess: () => setRestoreId(null),
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

      {/* Search + filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search groups"
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 rounded-lg border p-0.5 bg-muted/30">
          {ARCHIVE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleArchiveFilter(f.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                archivedFilter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
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
      {!isLoading && !isError && groups.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title={
            searchQuery
              ? "No matching groups"
              : archivedFilter === "archived"
                ? "No archived groups"
                : "No groups yet"
          }
          description={
            searchQuery
              ? "No groups match your search. Try a different term."
              : archivedFilter === "archived"
                ? "Archived groups will appear here after you archive them."
                : "Create your first device group to start organizing devices."
          }
          action={
            searchQuery
              ? { label: "Clear Search", onClick: () => handleSearch("") }
              : archivedFilter === "active" && !searchQuery
                ? { label: "Create Group", onClick: () => setCreateOpen(true) }
                : undefined
          }
        />
      )}

      {/* Group cards grid */}
      {!isLoading && !isError && groups.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const isArchived = !!group.archivedAt;
              return (
                <Card
                  key={group.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/30",
                    isArchived && "opacity-70",
                  )}
                  onClick={() => router.push(`/groups/${group.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderKanban className="h-5 w-5 text-muted-foreground shrink-0" />
                        <CardTitle className="text-base truncate">{group.name}</CardTitle>
                        {isArchived && (
                          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Archived
                          </span>
                        )}
                      </div>
                      {/* Archived group: restore */}
                      {isArchived ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-emerald-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRestoreId(group.id);
                          }}
                          aria-label={`Restore group ${group.name}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-amber-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArchiveId(group.id);
                            setArchiveName(group.name);
                          }}
                          aria-label={`Archive group ${group.name}`}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
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
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({total} group{total !== 1 ? "s" : ""})
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
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

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archiveId} onOpenChange={(open) => { if (!open) setArchiveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Device Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{archiveName}</strong>?
              <span className="block mt-2 text-muted-foreground">
                The group will be hidden from normal views but all relationships
                and audit history are preserved. You can restore it later.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiveGroup.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {archiveGroup.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreId} onOpenChange={(open) => { if (!open) setRestoreId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Device Group</AlertDialogTitle>
            <AlertDialogDescription>
              Restore this archived group? It will become visible in normal views again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoreGroup.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {restoreGroup.isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device Group</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the group. Devices are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteGroup.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
