"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequirePermission } from "@/components/shared/require-permission";
import { formatRelativeTime } from "@sentience/utils";
import {
  Key,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  XCircle,
  Search,
  X,
  Loader2,
  AlertTriangle,
  KeyRound,
  Clock,
} from "lucide-react";
import type { ApiKey, ApiKeyStatus } from "@sentience/types";

// ---- Mock API keys ----
const initialKeys: ApiKey[] = [
  {
    id: "KEY-001",
    name: "Production Integration",
    maskedKey: "sk-prod•a3f8••••••••9b2c",
    fullKey: "sk-prod-a3f8k2m9x7q4w1e5r6t8y0u3i7o2p9l2b4c",
    status: "active",
    createdAt: "2026-03-15T10:00:00Z",
    expiresAt: "2027-03-15T10:00:00Z",
    lastUsedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    createdBy: "Alice Johnson",
    requestCount: 15482,
  },
  {
    id: "KEY-002",
    name: "Staging Environment",
    maskedKey: "sk-stag•b7e2••••••••3f1a",
    fullKey: "sk-stag-b7e2n5m8x1q4w9e6r3t7y0u2i5o8p1l4k9c",
    status: "active",
    createdAt: "2026-04-01T14:00:00Z",
    expiresAt: "2027-04-01T14:00:00Z",
    lastUsedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: "Alice Johnson",
    requestCount: 3891,
  },
  {
    id: "KEY-003",
    name: "Dev Test Key",
    maskedKey: "sk-dev••c4d1••••••••8e7f",
    fullKey: "sk-dev-c4d1k9m2x7q3w8e5r1t6y0u4i9o2p7l3b8c",
    status: "revoked",
    createdAt: "2026-02-10T09:00:00Z",
    expiresAt: "2027-02-10T09:00:00Z",
    lastUsedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: "Bob Smith",
    requestCount: 12450,
  },
  {
    id: "KEY-004",
    name: "Partner API Access",
    maskedKey: "sk-part•f5g6••••••••2h3i",
    fullKey: "sk-part-f5g6h7j8k9l0q1w2e3r4t5y6u7i8o9p0a1s2",
    status: "expired",
    createdAt: "2025-01-01T00:00:00Z",
    expiresAt: "2026-01-01T00:00:00Z",
    lastUsedAt: "2025-12-15T08:30:00Z",
    createdBy: "Alice Johnson",
    requestCount: 8923,
  },
];

const statusColors: Record<ApiKeyStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400",
  expired: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  revoked: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400",
};

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "sk-";
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function maskKey(key: string): string {
  const prefix = key.slice(0, 7);
  const suffix = key.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newExpiration, setNewExpiration] = useState("1y");
  const [saving, setSaving] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const filteredKeys = useMemo(() => {
    return keys.filter((k) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        k.name.toLowerCase().includes(q) ||
        k.id.toLowerCase().includes(q) ||
        k.maskedKey.toLowerCase().includes(q)
      );
    });
  }, [keys, search]);

  const activeKeys = useMemo(() => keys.filter((k) => k.status === "active").length, [keys]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    setSaving(true);
    const fullKey = generateKey();
    const expirationMap: Record<string, string | null> = {
      "1m": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      "3m": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      "1y": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      never: null,
    };

    setTimeout(() => {
      const newKey: ApiKey = {
        id: `KEY-${String(keys.length + 1).padStart(3, "0")}`,
        name: newName.trim(),
        maskedKey: maskKey(fullKey),
        fullKey,
        status: "active",
        createdAt: new Date().toISOString(),
        expiresAt: expirationMap[newExpiration] ?? null,
        lastUsedAt: null,
        createdBy: "Alice Johnson",
        requestCount: 0,
      };
      setKeys((prev) => [newKey, ...prev]);
      setCreatedKey(fullKey);
      setNewName("");
      setSaving(false);
    }, 400);
  };

  const handleRevoke = (keyId: string) => {
    setKeys((prev) =>
      prev.map((k) =>
        k.id === keyId ? { ...k, status: "revoked" as const } : k,
      ),
    );
    setConfirmRevoke(null);
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleReveal = (keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  };

  return (
    <RequirePermission resource="admin" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="API Keys"
          description="Create and manage API keys for integrations"
          actions={
            <Button onClick={() => setShowCreate(true)}>
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

        {/* Keys list */}
        <div className="rounded-lg border">
          {filteredKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Key className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No API keys found</p>
              <p className="text-xs text-muted-foreground">
                {search ? "Try adjusting your search" : "Create your first API key to get started"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredKeys.map((key) => (
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
                        <code className="text-xs font-mono text-muted-foreground">
                          {revealedKeys.has(key.id) && key.fullKey ? key.fullKey : key.maskedKey}
                        </code>
                        {key.fullKey && (
                          <button
                            onClick={() => toggleReveal(key.id)}
                            className="text-muted-foreground hover:text-foreground"
                            title={revealedKeys.has(key.id) ? "Hide key" : "Show key"}
                          >
                            {revealedKeys.has(key.id) ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        {key.fullKey && key.status === "active" && (
                          <button
                            onClick={() => handleCopy(key.fullKey!)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copy key"
                          >
                            {copiedKey === key.fullKey ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
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

                  {/* Revoke action */}
                  {key.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmRevoke(key.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2 shrink-0"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Revoke</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Dialog */}
        {showCreate && !createdKey && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => { setShowCreate(false); setSaving(false); }} />
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
                <Button onClick={handleCreate} disabled={!newName.trim() || saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
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
                >
                  Revoke Key
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
