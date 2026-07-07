"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
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
import { useAdminStats } from "@/hooks/use-admin";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

const statCards = [
  { label: "Platform Version", key: "platformVersion" as const, render: (v: string) => v },
  { label: "Active Users", key: "activeUsers" as const, render: (v: number) => String(v) },
  {
    label: "System Uptime",
    key: "systemUptime" as const,
    render: (v: number) => formatUptime(v),
  },
  { label: "Pending Alerts", key: "openAlerts" as const, render: (v: number) => String(v) },
];
import {
  Settings,
  Key,
  Bell,
  Activity,
  ClipboardList,
  ShieldCheck,
  Users,
  ChevronRight,
} from "lucide-react";

const adminSections = [
  {
    title: "System Settings",
    description: "Tenant settings, feature flags, and maintenance mode",
    href: "/settings",
    icon: Settings,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    title: "API Keys",
    description: "Manage API keys for integrations",
    href: "/admin/api-keys",
    icon: Key,
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    title: "Notification Rules",
    description: "Alert thresholds and notification channels",
    href: "/admin/notification-rules",
    icon: Bell,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    title: "Platform Health",
    description: "Service status and system metrics",
    href: "/admin/health",
    icon: Activity,
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    title: "Audit Log",
    description: "Track system activity and changes",
    href: "/audit-log",
    icon: ClipboardList,
    color: "text-rose-500",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
  {
    title: "User Management",
    description: "Manage users, roles, and permissions",
    href: "/users",
    icon: Users,
    color: "text-indigo-500",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
];

export default function AdminPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { data, isLoading } = useAdminStats();
  const stats = data?.stats;

  return (
    <RequirePermission resource="admin" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Admin"
          description="System administration and platform management"
        />

        {/* System status summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              System Overview
            </CardTitle>
            <CardDescription>
              Welcome back, {currentUser?.name ?? "Administrator"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card) => (
                <div key={card.label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">{card.label}</p>
                  <p className="text-lg font-semibold">
                    {isLoading ? (
                      <span className="inline-block h-5 w-16 animate-pulse rounded bg-muted" />
                    ) : stats ? (
                      card.render(stats[card.key] as never)
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Admin module cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.title} href={section.href}>
                <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30 cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${section.bgColor}`}>
                        <Icon className={`h-5 w-5 ${section.color}`} />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
                    </div>
                    <h3 className="text-sm font-semibold mt-4">{section.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </RequirePermission>
  );
}
