"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@sentience/utils";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission, type Resource } from "@/lib/permissions";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Monitor,
  AlertTriangle,
  History,
  FileText,
  Stethoscope,
  Users,
  Shield,
  Bell,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SentienceLogo } from "@/components/shared/sentience-logo";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  resource: Resource;
}

const allNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, resource: "dashboard" },
  { name: "Estates", href: "/estates", icon: Building2, resource: "estates" },
  { name: "Sites", href: "/sites", icon: MapPin, resource: "sites" },
  { name: "Devices", href: "/devices", icon: Monitor, resource: "devices" },
  { name: "Alerts", href: "/alerts", icon: AlertTriangle, resource: "alerts" },
  { name: "Events", href: "/events", icon: History, resource: "events" },
  { name: "Reports", href: "/reports", icon: FileText, resource: "reports" },
  { name: "Diagnostics", href: "/diagnostics", icon: Stethoscope, resource: "diagnostics" },
  { name: "Users", href: "/users", icon: Users, resource: "users" },
  { name: "Roles", href: "/roles", icon: Shield, resource: "roles" },
  { name: "Notifications", href: "/notifications", icon: Bell, resource: "notifications" },
  { name: "Audit Log", href: "/audit-log", icon: ClipboardList, resource: "audit-log" },
  { name: "Settings", href: "/settings", icon: Settings, resource: "settings" },
  { name: "Admin", href: "/admin", icon: ShieldCheck, resource: "admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { sidebarCollapsed, toggleSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } =
    useUIStore();

  // Filter navigation by the user's role permissions
  const navigation = allNavigation.filter((item) =>
    hasPermission(user?.role, item.resource, "read"),
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar transition-all duration-300 lg:static",
          sidebarCollapsed ? "w-16" : "w-64",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-14 items-center border-b px-4",
            sidebarCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <SentienceLogo />
              <span>Sentience</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/dashboard" aria-label="Sentience dashboard">
              <SentienceLogo />
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-2 space-y-1">
          {navigation.length === 0 && (
            <p className="px-3 text-xs text-muted-foreground">No modules available</p>
          )}
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  sidebarCollapsed && "justify-center px-2",
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden border-t p-2 lg:block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
