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
} from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useAuditStore } from "@/stores/audit-store";
import { ROLE_META, hasPermission, type Resource, type Action } from "@/lib/permissions";
import { RequirePermission } from "@/components/shared/require-permission";
import type { User, UserRole } from "@sentience/types";

// ---- Mock users data ----
const initialUsers: User[] = [
  { id: "USR-001", name: "Alice Johnson", email: "alice@sentience.io", role: "admin", isActive: true, mfaEnabled: true, lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), createdAt: "2026-01-15T08:00:00Z", updatedAt: "2026-06-30T12:00:00Z" },
  { id: "USR-002", name: "Bob Smith", email: "bob@sentience.io", role: "support", isActive: true, mfaEnabled: false, lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), createdAt: "2026-02-20T09:00:00Z", updatedAt: "2026-05-15T10:00:00Z" },
  { id: "USR-003", name: "Carol Davis", email: "carol@sentience.io", role: "installer", isActive: true, mfaEnabled: false, lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), createdAt: "2026-03-10T07:30:00Z", updatedAt: "2026-04-20T14:00:00Z" },
  { id: "USR-004", name: "Dan Wilson", email: "dan@customer.com", role: "customer", isActive: true, mfaEnabled: false, customerId: "CUST-001", lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), createdAt: "2026-01-05T10:00:00Z", updatedAt: "2026-06-10T09:00:00Z" },
  { id: "USR-005", name: "Eve Martin", email: "eve@customer.com", role: "customer", isActive: false, mfaEnabled: false, lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), createdAt: "2026-01-10T11:00:00Z", updatedAt: "2026-06-20T08:00:00Z" },
  { id: "USR-006", name: "Frank Miller", email: "frank@sentience.io", role: "installer", isActive: true, mfaEnabled: false, lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), createdAt: "2026-04-01T06:00:00Z", updatedAt: "2026-06-25T15:00:00Z" },
  { id: "USR-007", name: "Grace Lee", email: "grace@sentience.io", role: "support", isActive: true, mfaEnabled: true, lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), createdAt: "2026-03-15T09:30:00Z", updatedAt: "2026-06-28T11:00:00Z" },
];

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const addAuditEntry = useAuditStore((s) => s.addEntry);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New user form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("customer");

  // Can the current user create/edit/delete?
  const canManage = hasPermission(currentUser?.role, "users", "manage");
  const canEdit = hasPermission(currentUser?.role, "users", "update");
  const canDelete = hasPermission(currentUser?.role, "users", "delete");

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.id.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "inactive" && !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleCreate = () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setSaving(true);
    const newUser: User = {
      id: `USR-${String(users.length + 1).padStart(3, "0")}`,
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      isActive: true,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTimeout(() => {
      setUsers((prev) => [newUser, ...prev]);
      addAuditEntry({
        userId: currentUser?.id ?? "system",
        userName: currentUser?.name ?? "System",
        userRole: currentUser?.role ?? "admin",
        action: "create",
        resource: "User",
        resourceId: newUser.id,
        description: `Created user ${newUser.name} (${newUser.role})`,
      });
      setNewName("");
      setNewEmail("");
      setNewRole("customer");
      setShowCreateDialog(false);
      setSaving(false);
    }, 400);
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const oldRole = u.role;
          addAuditEntry({
            userId: currentUser?.id ?? "system",
            userName: currentUser?.name ?? "System",
            userRole: currentUser?.role ?? "admin",
            action: "update",
            resource: "User",
            resourceId: userId,
            description: `Changed ${u.name}'s role from ${oldRole} to ${newRole}`,
          });
          return { ...u, role: newRole, updatedAt: new Date().toISOString() };
        }
        return u;
      }),
    );
  };

  const handleToggleActive = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = !u.isActive;
          const action = newStatus ? "activated" : "deactivated";
          addAuditEntry({
            userId: currentUser?.id ?? "system",
            userName: currentUser?.name ?? "System",
            userRole: currentUser?.role ?? "admin",
            action: "update",
            resource: "User",
            resourceId: userId,
            description: `${newStatus ? "Activated" : "Deactivated"} user ${u.name}`,
          });
          return { ...u, isActive: newStatus, updatedAt: new Date().toISOString() };
        }
        return u;
      }),
    );
    setShowDeleteConfirm(null);
  };

  const roleOptions: UserRole[] = ["admin", "support", "installer", "customer"];

  const statusCounts = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [users]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      counts[u.role] = (counts[u.role] ?? 0) + 1;
    });
    return counts;
  }, [users]);

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
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4" />
                    Add User
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Summary cards */}
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-10 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{ROLE_META[r].label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Users list */}
        <div className="rounded-lg border">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No users found</p>
              <p className="text-xs text-muted-foreground">
                {search || roleFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Add your first user to get started"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map((user) => {
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
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                            title="Change role"
                          >
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>{ROLE_META[r].label}</option>
                            ))}
                          </select>

                          {/* Toggle active */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(user.id)}
                            title={user.isActive ? "Deactivate user" : "Activate user"}
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
          )}
        </div>

        {/* Create User Dialog */}
        {showCreateDialog && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCreateDialog(false)} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Create User</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>{ROLE_META[r].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || !newEmail.trim() || saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
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
