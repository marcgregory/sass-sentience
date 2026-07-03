"use client";

import { useState, useCallback } from "react";
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
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/require-permission";
import { useRoles } from "@/hooks/use-users";
import { useRole, useGrantPermission, useRevokePermission } from "@/hooks/use-roles";
import { useAuthStore } from "@/stores/auth-store";
import { useAuditStore } from "@/stores/audit-store";
import {
  ROLE_META,
  ALL_RESOURCES,
  ALL_ACTIONS,
  RESOURCE_LABELS,
  hasPermission,
  type Resource,
  type Action,
} from "@/lib/permissions";
import type { UserRole } from "@sentience/types";
import {
  Shield,
  Users,
  Wrench,
  Eye,
  Check,
  X as XIcon,
  Info,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const roleIcons: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  support: Users,
  installer: Wrench,
  customer: Eye,
};

/** All roles in order of privilege */
const ALL_ROLES: UserRole[] = ["admin", "support", "installer", "customer"];

export default function RolesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const addAuditEntry = useAuditStore((s) => s.addEntry);
  const [expandedRole, setExpandedRole] = useState<UserRole | null>("admin");

  // Fetch role list from API
  const { roles, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useRoles();

  // Find the API ID for the expanded role
  const expandedRoleMeta = expandedRole ? ROLE_META[expandedRole] : null;
  const expandedRoleApi = expandedRoleMeta
    ? roles.find((r) => r.name === expandedRole)
    : undefined;

  // Fetch expanded role detail (with permissions)
  const {
    role: roleDetail,
    permissions: rolePermissions,
    isLoading: detailLoading,
  } = useRole(expandedRoleApi?.id);

  // Mutations
  const grantMutation = useGrantPermission();
  const revokeMutation = useRevokePermission();

  const canManage = hasPermission(currentUser?.role, "roles", "manage");

  const isMutating = grantMutation.isPending || revokeMutation.isPending;

  const isEnabled = useCallback(
    (role: UserRole, resource: Resource, action: Action): boolean => {
      // For the expanded role, check API permissions
      if (expandedRole === role && rolePermissions.length > 0) {
        // "manage" implies all lower actions
        const hasManage = rolePermissions.some(
          (p) => p.resource === resource && p.action === "manage",
        );
        if (hasManage) return true;
        return rolePermissions.some(
          (p) => p.resource === resource && p.action === action,
        );
      }
      // Fall back to static matrix for non-expanded roles
      return hasPermission(role, resource, action);
    },
    [expandedRole, rolePermissions],
  );

  const handleToggle = (role: UserRole, resource: Resource, action: Action) => {
    if (!canManage || !expandedRoleApi?.id) return;

    const enabled = isEnabled(role, resource, action);

    if (enabled) {
      revokeMutation.mutate({
        roleId: expandedRoleApi.id,
        resource,
        action,
      });
    } else {
      grantMutation.mutate({
        roleId: expandedRoleApi.id,
        resource,
        action,
      });
    }

    addAuditEntry({
      userId: currentUser?.id ?? "system",
      userName: currentUser?.name ?? "System",
      userRole: currentUser?.role ?? "admin",
      action: "update",
      resource: "Role",
      description: `${enabled ? "Revoked" : "Granted"} ${action} on ${RESOURCE_LABELS[resource]} for ${ROLE_META[role].label}`,
    });
  };

  return (
    <RequirePermission resource="roles" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Roles & Permissions"
          description="Manage role-based access control"
          actions={
            rolesError ? (
              <Button variant="outline" size="sm" onClick={() => refetchRoles()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Retry
              </Button>
            ) : canManage ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Toggle permissions to update
              </p>
            ) : null
          }
        />

        {/* Loading state */}
        {rolesLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading roles…</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {rolesError && !rolesLoading && (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium">Failed to load roles</p>
              <p className="text-xs text-muted-foreground">
                The role data could not be fetched. The permission matrix below uses default values.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchRoles()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!rolesLoading && !rolesError && roles.length === 0 && (
          <EmptyState
            icon={Shield}
            title="No roles found"
            description="No roles have been created yet. Roles define access permissions for users."
          />
        )}

        {/* Role summary cards */}
        {(roles.length > 0 || rolesError) && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_ROLES.map((role) => {
              const meta = ROLE_META[role];
              const Icon = roleIcons[role];
              const grantedResources = ALL_RESOURCES.filter((r) =>
                isEnabled(role, r, "read"),
              );
              return (
                <Card
                  key={role}
                  className={`hover:border-primary/50 transition-colors cursor-pointer ${
                    expandedRole === role ? "border-primary" : ""
                  }`}
                  onClick={() => setExpandedRole(expandedRole === role ? null : role)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.bgColor}`}>
                          <Icon className={`h-5 w-5 ${meta.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{meta.label}</CardTitle>
                          <CardDescription>{meta.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {grantedResources.map((r) => (
                        <span key={r} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {RESOURCE_LABELS[r]}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Expanded permission matrix */}
        {expandedRole && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_META[expandedRole].bgColor} ${ROLE_META[expandedRole].color}`}>
                  {ROLE_META[expandedRole].label}
                </span>
                Permissions
              </CardTitle>
              <CardDescription>
                {detailLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading permissions…
                  </span>
                ) : canManage ? (
                  "Toggle permissions on/off for this role"
                ) : (
                  "View permissions for this role"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Resource</th>
                    {ALL_ACTIONS.map((action) => (
                      <th key={action} className="text-center py-2 px-3 font-medium text-muted-foreground capitalize">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_RESOURCES.filter((r) => r !== "profile").map((resource) => (
                    <tr key={resource} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 pr-4 font-medium">
                        {RESOURCE_LABELS[resource]}
                      </td>
                      {ALL_ACTIONS.map((action) => {
                        const enabled = isEnabled(expandedRole, resource, action);
                        return (
                          <td key={action} className="text-center py-3 px-3">
                            <button
                              disabled={!canManage || isMutating}
                              onClick={() => handleToggle(expandedRole, resource, action)}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                enabled
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600"
                              } ${canManage && !isMutating ? "cursor-pointer hover:ring-2 hover:ring-ring" : "cursor-default"} ${isMutating ? "opacity-50" : ""}`}
                              title={`${enabled ? "Revoke" : "Grant"} ${action} on ${RESOURCE_LABELS[resource]}`}
                            >
                              {enabled ? <Check className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </RequirePermission>
  );
}
