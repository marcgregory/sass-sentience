"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  Mail,
  Search,
  X,
  Check,
  Shield,
  Eye,
  Wrench,
  UserCog,
  Loader2,
  Ban,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";
import { useAuthStore } from "@/stores/auth-store";
import { ROLE_META, hasPermission, type Resource, type Action } from "@/lib/permissions";
import { RequirePermission } from "@/components/shared/require-permission";
import type { User, UserRole } from "@sentience/types";
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser, useRoles } from "@/hooks/use-users";

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);

  // ─── Server state ──────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const { users, total, totalPages, isLoading, isError, error, refetch } = useUsers({
    search: search || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: 20,
  });

  const { roles } = useRoles();

  // ─── Mutations ─────────────────────────────────────────────────────────
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();
  const [mutationFeedback, setMutationFeedback] = useState<string | null>(null);
  const mutationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((message: string) => {
    if (mutationTimeoutRef.current) clearTimeout(mutationTimeoutRef.current);
    setMutationFeedback(message);
    mutationTimeoutRef.current = setTimeout(() => setMutationFeedback(null), 3000);
  }, []);

  // ─── Dialog state ──────────────────────────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, email: false, password: false });

  // When roles load and the dialog is open but no role is selected yet,
  // set the default to Customer so the form is ready to go.
  useEffect(() => {
    if (showCreateDialog && !newRoleId && roles.length > 0) {
      setNewRoleId(roles.find((r) => r.name === "customer")?.id ?? roles[0].id);
    }
  }, [showCreateDialog, newRoleId, roles]);

  // ─── Permissions ──────────────────────────────────────────────────────
  const canManage = hasPermission(currentUser?.role, "users", "manage");
  const canEdit = hasPermission(currentUser?.role, "users", "update");
  const canDelete = hasPermission(currentUser?.role, "users", "delete");

  // ─── Role helpers ──────────────────────────────────────────────────────
  const roleNameToId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of roles) {
      map[r.name] = r.id;
    }
    return map;
  }, [roles]);

  const roleIdToName = useMemo(() => {
    const map: Record<string, UserRole> = {};
    for (const r of roles) {
      map[r.id] = r.name;
    }
    return map;
  }, [roles]);

  // Derived validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidName = newName.trim().length > 0;
  const isValidEmail = emailRegex.test(newEmail.trim());
  const isValidPassword = newPassword.length >= 6;
  const canCreate = isValidName && isValidEmail && isValidPassword && !!newRoleId && !createMutation.isPending;

  // Set default role ID when roles load and dialog opens
  const resetCreateForm = () => {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRoleId(roles.find((r) => r.name === "customer")?.id ?? "");
    setCreateError(null);
    setTouched({ name: false, email: false, password: false });
  };

  // ─── Actions ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim() || !newRoleId) return;
    setCreateError(null);
    try {
      await createMutation.mutateAsync({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword.trim(),
        roleId: newRoleId,
      });
      setShowCreateDialog(false);
      resetCreateForm();
    } catch (err) {
      setCreateError((err as Error).message ?? "Failed to create user");
    }
  };

  const handleRoleChange = (userId: string, newRoleId: string) => {
    updateMutation.mutate(
      { id: userId, payload: { roleId: newRoleId } },
      {
        onSuccess: () => showFeedback("User role updated successfully"),
        onError: () => showFeedback("Failed to update user role"),
      },
    );
  };

  const handleToggleActive = (user: { id: string; isActive: boolean }) => {
    if (user.isActive) {
      deactivateMutation.mutate(user.id, {
        onSuccess: () => showFeedback("User deactivated successfully"),
        onError: () => showFeedback("Failed to deactivate user"),
      });
    } else {
      // Re-activate: update isActive to true
      updateMutation.mutate(
        { id: user.id, payload: { isActive: true } },
        {
          onSuccess: () => showFeedback("User activated successfully"),
          onError: () => showFeedback("Failed to activate user"),
        },
      );
    }
  };

  // ─── Derived metrics from server data ──────────────────────────────────

  const statusCounts = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [users]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      const roleName = u.role;
      counts[roleName] = (counts[roleName] ?? 0) + 1;
    });
    return counts;
  }, [users]);

  const roleOptions = roles.map((r) => r.name as UserRole);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <RequirePermission resource="users" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="User Management"
          description="Manage users, roles, and permissions"
          actions={
            <div className="flex gap-2">
              {canManage && (
                <>
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4" />
                    Invite User
                  </Button>
                  <Button
                    onClick={() => {
                      resetCreateForm();
                      setShowCreateDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add User
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Summary cards */}
        {!isLoading && users.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statusCounts.active}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Inactive</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statusCounts.inactive}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Roles</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {roleOptions.map((r) => (
                  <span
                    key={r}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_META[r].bgColor} ${ROLE_META[r].color}`}
                  >
                    {roleCounts[r] ?? 0} {ROLE_META[r].label}
                  </span>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search users"
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background py-2 pl-10 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{ROLE_META[r].label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as "all" | "active" | "inactive"); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* ─── Loading State ───────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60 mb-4" />
            <p className="text-sm text-muted-foreground">Loading users...</p>
          </div>
        )}

        {/* ─── Error State ─────────────────────────────────────────────── */}
        {isError && !isLoading && (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive/60 mb-4" />
              <p className="text-sm font-medium text-destructive mb-1">Failed to load users</p>
              <p className="text-xs text-muted-foreground mb-4">{error?.message ?? "An unexpected error occurred"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ─── Mutation Feedback ───────────────────────────────────────────── */}
        {mutationFeedback && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 animate-fade-in">
            {mutationFeedback}
          </div>
        )}

        {/* ─── Empty State ─────────────────────────────────────────────── */}
        {!isLoading && !isError && users.length === 0 && (
          <div className="rounded-lg border">
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No users found</p>
              <p className="text-xs text-muted-foreground">
                {search || roleFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Add your first user to get started"}
              </p>
            </div>
          </div>
        )}

        {/* ─── Users list ──────────────────────────────────────────────── */}
        {!isLoading && !isError && users.length > 0 && (
          <div className="rounded-lg border">
            <div className="divide-y">
              {users.map((user) => {
                const meta = ROLE_META[user.role];
                return (
                  <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${meta.bgColor} ${meta.color}`}>
                        {user.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          {user.id === currentUser?.id && (
                            <span className="text-[10px] text-muted-foreground">(you)</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.bgColor} ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        {user.lastLogin ? formatRelativeTime(user.lastLogin) : "Never"}
                      </span>

                      {/* Actions */}
                      {canManage && user.id !== currentUser?.id && (
                        <div className="flex items-center gap-1">
                          {/* Quick role change */}
                          <select
                            value={user.roleId}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                            title="Change role"
                            disabled={updateMutation.isPending}
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>{ROLE_META[r.name].label}</option>
                            ))}
                          </select>

                          {/* Toggle active */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(user)}
                            disabled={deactivateMutation.isPending || updateMutation.isPending}
                            aria-label={user.isActive ? `Deactivate user ${user.name}` : `Activate user ${user.name}`}
                          >
                            {user.isActive ? (
                              <Ban className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Create User Dialog ──────────────────────────────────────── */}
        {showCreateDialog && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCreateDialog(false)} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Create User</h3>
              {createError && (
                <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  {createError}
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setTouched((prev) => ({ ...prev, name: true })); }}
                    onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
                      touched.name && !isValidName ? "border-destructive" : "border-input"
                    }`}
                    placeholder="John Doe"
                    autoComplete="name"
                  />
                  {touched.name && !isValidName && (
                    <p className="text-xs text-destructive">Full name is required</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setTouched((prev) => ({ ...prev, email: true })); }}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
                      touched.email && !isValidEmail ? "border-destructive" : "border-input"
                    }`}
                    placeholder="john@example.com"
                    autoComplete="off"
                  />
                  {touched.email && !isValidEmail && (
                    <p className="text-xs text-destructive">Enter a valid email address</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setTouched((prev) => ({ ...prev, password: true })); }}
                    onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
                      touched.password && !isValidPassword ? "border-destructive" : "border-input"
                    }`}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                  />
                  {touched.password && !isValidPassword && (
                    <p className="text-xs text-destructive">Password must be at least 6 characters</p>
                  )}
                  {newPassword.length > 0 && isValidPassword && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Password meets minimum length</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
                      !newRoleId ? "text-muted-foreground" : ""
                    }`}
                  >
                    {roles.length === 0 && <option value="">Loading roles...</option>}
                    {roles.length > 0 && (
                      <>
                        <option value="" disabled>Select a role</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleCreate}
                  disabled={!canCreate}
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create User
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
