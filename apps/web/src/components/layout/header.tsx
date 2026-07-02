"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Search,
  Moon,
  Sun,
  Bell,
  User,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  Shield,
  Wrench,
  Eye,
} from "lucide-react";
import type { UserRole } from "@sentience/types";
import { ROLE_META } from "@/lib/permissions";

const roleIcons: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  support: Users,
  installer: Wrench,
  customer: Eye,
};

export function Header() {
  const router = useRouter();
  const { setMobileMenuOpen } = useUIStore();
  const { user, logout, loginAsRole, demoAccounts } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push("/login");
  };

  const handleRoleSwitch = (role: UserRole) => {
    loginAsRole(role);
    setShowRoleMenu(false);
    router.push("/dashboard");
  };

  const roleMeta = user ? ROLE_META[user.role] : null;
  const RoleIcon = user ? roleIcons[user.role] : User;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="hidden flex-1 md:flex md:items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search devices, sites, alerts..."
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Realtime connection indicator */}
        <div className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 sm:flex">
          {isSocketConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Live
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Disconnected
              </span>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            3
          </span>
        </Button>

        {/* User with role badge and switch */}
        <div className="flex items-center gap-2 border-l pl-3 relative">
          <div className="hidden text-right md:block">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium">{user?.name ?? "User"}</p>
              {roleMeta && (
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${roleMeta.bgColor} ${roleMeta.color}`}>
                  {roleMeta.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
          </div>

          {/* User avatar dropdown trigger */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
            </Button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border bg-popover p-1.5 shadow-lg">
                  <div className="px-2 py-1.5 border-b mb-1">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { router.push("/profile"); setShowUserMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); setShowRoleMenu(true); }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Switch Role (Demo)
                  </button>
                  <div className="border-t mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Role switch modal */}
      {showRoleMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowRoleMenu(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-1">Switch Role (Demo)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a role to see different navigation and permissions.
            </p>
            <div className="space-y-2">
              {demoAccounts.map((account) => {
                const meta = ROLE_META[account.role];
                const Icon = roleIcons[account.role];
                const isCurrent = user?.id === account.id;
                return (
                  <button
                    key={account.role}
                    onClick={() => handleRoleSwitch(account.role)}
                    disabled={isCurrent}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isCurrent
                        ? "border-primary bg-primary/5 cursor-not-allowed"
                        : "hover:border-primary/50 hover:bg-accent"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.bgColor}`}>
                      <Icon className={`h-5 w-5 ${meta.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{account.email}</p>
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-medium text-primary">Active</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowRoleMenu(false)}
              className="mt-4 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </header>
  );
}
