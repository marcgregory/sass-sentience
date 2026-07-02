"use client";

import { useAuthStore } from "@/stores/auth-store";
import { hasPermission, type Resource, type Action } from "@/lib/permissions";
import { ShieldBan } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RouteGuardProps {
  children: React.ReactNode;
  resource: Resource;
  action?: Action;
  /** If true, show AccessDenied instead of redirecting */
  showDenied?: boolean;
}

export function RouteGuard({
  children,
  resource,
  action = "read",
  showDenied = false,
}: RouteGuardProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Not authenticated — render nothing (let the root layout redirect)
  if (!isAuthenticated || !user) return null;

  const permitted = hasPermission(user.role, resource, action);

  if (!permitted && showDenied) {
    return <AccessDenied resource={resource} />;
  }

  if (!permitted) {
    // Render the children but wrapped in a redirect — the layout does this
    return null;
  }

  return <>{children}</>;
}

function AccessDenied({ resource }: { resource: Resource }) {
  const label = resource.charAt(0).toUpperCase() + resource.slice(1).replace("-", " ");
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldBan className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        You do not have permission to access the <strong>{label}</strong> module.
        Contact your administrator if you believe this is a mistake.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 gap-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
