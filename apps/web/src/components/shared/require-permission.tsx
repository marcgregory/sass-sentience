"use client";

import { useAuthStore } from "@/stores/auth-store";
import { hasPermission, type Resource, type Action } from "@/lib/permissions";
import { ShieldBan } from "lucide-react";
import Link from "next/link";

interface RequirePermissionProps {
  children: React.ReactNode;
  resource: Resource;
  action?: Action;
  /** Content to show while loading/checking */
  fallback?: React.ReactNode;
}

export function RequirePermission({
  children,
  resource,
  action = "read",
  fallback,
}: RequirePermissionProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated || !user) {
    return fallback ?? null;
  }

  const permitted = hasPermission(user.role, resource, action);

  if (!permitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldBan className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          You do not have permission to access this page. Contact your
          administrator if you believe this is a mistake.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
