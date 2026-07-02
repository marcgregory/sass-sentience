"use client";

import { useState } from "react";
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
import { RequirePermission } from "@/components/shared/require-permission";
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
} from "lucide-react";

const roleIcons: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  support: Users,
  installer: Wrench,
  customer: Eye,
};

/** All roles in order of privilege */
const ALL_ROLES: UserRole[] = ["admin", "support", "installer", "customer"];

/**
 * Simulated permissions store — in a real app this would come from the API.
 * For this demo, we derive the "current" state from the permission matrix and
 * allow toggling per resource.
 */
function usePermissionState() {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isEnabled = (role: UserRole, resource: Resource, action: Action) => {
    const key = `${role}:${resource}:${action}`;
    if (key in overrides) return overrides[key];
    return hasPermission(role, resource, action);
  };

  const toggle = (role: UserRole, resource: Resource, action: Action) => {
    const key = `${role}:${resource}:${action}`;
    setOverrides((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return { isEnabled, toggle };
}

export default function RolesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const addAuditEntry = useAuditStore((s) => s.addEntry);
  const { isEnabled, toggle } = usePermissionState();
  const [expandedRole, setExpandedRole] = useState<UserRole | null>("admin");

  const canManage = hasPermission(currentUser?.role, "roles", "manage");

  const handleToggle = (role: UserRole, resource: Resource, action: Action) => {
    if (!canManage) return;
    const wasEnabled = isEnabled(role, resource, action);
    toggle(role, resource, action);
    addAuditEntry({
      userId: currentUser?.id ?? "system",
      userName: currentUser?.name ?? "System",
      userRole: currentUser?.role ?? "admin",
      action: "update",
      resource: "Role",
      description: `${wasEnabled ? "Revoked" : "Granted"} ${action} on ${RESOURCE_LABELS[resource]} for ${ROLE_META[role].label}`,
    });
  };

  return (
    <RequirePermission resource="roles" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Roles & Permissions"
          description="Manage role-based access control"
          actions={
            canManage && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Toggle permissions to update
              </p>
            )
          }
        />

        {/* Role summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_ROLES.map((role) => {
            const meta = ROLE_META[role];
            const Icon = roleIcons[role];
            const grantedResources = ALL_RESOURCES.filter((r) =>
              hasPermission(role, r, "read"),
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
                {canManage ? "Toggle permissions on/off for this role" : "View permissions for this role"}
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
                              disabled={!canManage}
                              onClick={() => handleToggle(expandedRole, resource, action)}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                enabled
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600"
                              } ${canManage ? "cursor-pointer hover:ring-2 hover:ring-ring" : "cursor-default"}`}
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
