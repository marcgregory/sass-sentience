"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/components/shared/require-permission";
import { formatRelativeTime } from "@sentience/utils";
import {
  Key,
  Plus,
  Copy,
  Check,
  XCircle,
  Search,
  X,
  Loader2,
  AlertTriangle,
  KeyRound,
  Clock,
  Trash2,
} from "lucide-react";
import type { ApiKeyStatus } from "@sentience/types";
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey } from "@/hooks/use-api-keys";
import type { ApiKeyListItem } from "@/lib/api-keys";
import { EmptyState } from "@/components/shared/empty-state";

const statusColors: Record<ApiKeyStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400",
  expired: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  revoked: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400",
};

export default function ApiKeysPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newExpiration, setNewExpiration] = useState("1y");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createdKeyId, setCreatedKeyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useApiKeys({ search: search || undefined, limit: 100 });
  const createMutation = useCreateApiKey();
  const revokeMutation = useRevokeApiKey();
  const deleteMutation = useDeleteApiKey();

  const keys = data?.data ?? [];
  const activeKeys = keys.filter((k) => k.status === "active").length;

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      // Parse expiration to ISO date
      let expiresAt: string | undefined;
      const expirationMap: Record<string, number> = {
        "1m": 30,
        "3m": 90,
        "1y": 365,
      };
      if (newExpiration !== "never") {
        const days = expirationMap[newExpiration];
        if (days) {
          expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const result = await createMutation.mutateAsync({
        name: newName.trim(),
        expiresAt,
      });

      setCreatedKey(result.fullKey);
      setCreatedKeyId(result.id);
      setNewName("");
      setShowCreate(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await revokeMutation.mutateAsync(keyId);
    } catch {
      // Error handled by mutation
    }
    setConfirmRevoke(null);
  };

  const handleDelete = async (keyId: string) => {
    try {
      await deleteMutation.mutateAsync(keyId);
    } catch {
      // Error handled by mutation
    }
    setConfirmDelete(null);
  };

  // Dismiss created-key banner
  useEffect(() => {
    if (!createdKey) return;
    const timer = setTimeout(() => setCreatedKey(null), 120_000);
    return () => clearTimeout(timer);
  }, [createdKey]);

  return (
    <RequirePermission resource="admin" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="API Keys"
          description="Create and manage API keys for integrations"
          actions={
            <Button onClick={() => setShowCreate(true)} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              Create API Key
            </Button>
          }
        />

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{keys.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{activeKeys}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revoked / Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{keys.length - activeKeys}</p>
            </CardContent>
          </Card>
        </div>

        {/* Created key banner */}
        {createdKey && (
          <div className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                API Key Created
              </p>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Copy this key now. For security, you won&apos;t be able to see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50 px-3 py-2 text-sm font-mono text-emerald-900 dark:text-emerald-200 break-all">
                {createdKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(createdKey)}
              >
                {copiedKey === createdKey ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreatedKey(null)}
              className="text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search API keys"
            placeholder="Search API keys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="rounded-lg border">
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="h-12 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <EmptyState
            icon={Key}
            title="Failed to load API keys"
            description={error instanceof Error ? error.message : "Could not reach the server."}
          />
        )}

        {/* Keys list */}
        {!isLoading && !isError && (
          <div className="rounded-lg border">
            {keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Key className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-sm font-medium text-muted-foreground mb-1">No API keys found</p>
                <p className="text-xs text-muted-foreground">
                  {search ? "Try adjusting your search" : "Create your first API key to get started"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        key.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <Key className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{key.name}</p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[key.status]}`}>
                            {key.status.charAt(0).toUpperCase() + key.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-xs font-mono text-muted-foreground">{key.maskedKey}</code>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground shrink-0 ml-4">
                      {key.lastUsedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(key.lastUsedAt)}
                        </span>
                      )}
                      <span>{key.requestCount.toLocaleString()} req</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {key.status === "active" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmRevoke(key.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={revokeMutation.isPending}
                            title="Revoke key"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {key.status === "revoked" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(key.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          disabled={deleteMutation.isPending}
                          title="Delete key permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Dialog */}
        {showCreate && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => { setShowCreate(false); }} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Create API Key</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Key Name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. Production Integration"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expiration</label>
                  <select
                    value={newExpiration}
                    onChange={(e) => setNewExpiration(e.target.value)}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="1m">30 days</option>
                    <option value="3m">90 days</option>
                    <option value="1y">1 year</option>
                    <option value="never">No expiration</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Key
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Revoke confirmation */}
        {confirmRevoke && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setConfirmRevoke(null)} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Revoke API Key</h3>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone. Any services using this key will lose access immediately.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmRevoke(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRevoke(confirmRevoke)}
                  disabled={revokeMutation.isPending}
                >
                  {revokeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Revoke Key
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setConfirmDelete(null)} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Delete API Key</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this revoked key. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Delete
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
