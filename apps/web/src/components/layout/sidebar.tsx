"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@sentience/utils";
import { useUIStore } from "@/stores/ui-store";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Estates",
    href: "/estates",
    icon: Building2,
  },
  { name: "Sites", href: "/sites", icon: MapPin },
  { name: "Devices", href: "/devices", icon: Monitor },
  { name: "Alerts", href: "/alerts", icon: AlertTriangle },
  { name: "Events", href: "/events", icon: History },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Diagnostics", href: "/diagnostics", icon: Stethoscope },
  { name: "Users", href: "/users", icon: Users },
  { name: "Roles", href: "/roles", icon: Shield },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Audit Log", href: "/audit-log", icon: ClipboardList },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } =
    useUIStore();

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
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                S
              </div>
              <span>Sentience</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/dashboard">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                S
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
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
