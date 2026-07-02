"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequirePermission } from "@/components/shared/require-permission";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/permissions";
import {
  Globe,
  Shield,
  Bell,
  Key,
  RefreshCw,
  Wifi,
  Database,
  Save,
  Loader2,
  Building2,
  ToggleLeft,
  AlertTriangle,
} from "lucide-react";
import type { UserRole } from "@sentience/types";

type SettingsTab = "general" | "tenant" | "security" | "notifications" | "feature-flags" | "maintenance";

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "general", label: "General", icon: Globe },
  { id: "tenant", label: "Tenant", icon: Building2 },
  { id: "feature-flags", label: "Features", icon: ToggleLeft },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "maintenance", label: "Maintenance", icon: RefreshCw },
];

// ---- Feature flags ----
interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  requiresRestart?: boolean;
}

const defaultFlags: FeatureFlag[] = [
  { key: "live-dashboard", label: "Live Dashboard", description: "Real-time device telemetry dashboard", enabled: true },
  { key: "advanced-diagnostics", label: "Advanced Diagnostics", description: "Detailed device diagnostic tools", enabled: true },
  { key: "csv-export", label: "CSV Export", description: "Export reports and audit logs to CSV", enabled: true },
  { key: "dark-mode-toggle", label: "Dark Mode Toggle", description: "Allow users to switch between light and dark themes", enabled: true },
  { key: "report-scheduling", label: "Report Scheduling", description: "Schedule recurring report generation", enabled: false },
  { key: "mfa-enforcement", label: "MFA Enforcement", description: "Require multi-factor authentication for all users", enabled: false },
  { key: "webhook-integrations", label: "Webhook Integrations", description: "Send events to external webhook endpoints", enabled: false },
  { key: "bulk-operations", label: "Bulk Operations", description: "Perform bulk device operations (update, delete, reboot)", enabled: false },
];

export default function SettingsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(defaultFlags);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const canManage = hasPermission(currentUser?.role, "settings", "manage");

  const enabledFlags = useMemo(() => featureFlags.filter((f) => f.enabled).length, [featureFlags]);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  const toggleFlag = (key: string) => {
    setFeatureFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  // ---- Toggle component ----
  const Toggle = ({
    enabled,
    onToggle,
    disabled = false,
  }: {
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      className={`h-6 w-11 shrink-0 rounded-full transition-colors ${
        disabled ? "cursor-default" : "cursor-pointer"
      } ${enabled ? "bg-primary" : "bg-input"}`}
    >
      <div
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-[22px]" : "translate-x-0.5"
        } ${disabled ? "opacity-50" : ""}`}
      />
    </button>
  );

  return (
    <RequirePermission resource="settings" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Settings"
          description="Configure platform settings and preferences"
        />

        {/* Tab bar */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg capitalize">
              {activeTab === "general" && "General Settings"}
              {activeTab === "tenant" && "Tenant & Organization"}
              {activeTab === "feature-flags" && "Feature Flags"}
              {activeTab === "security" && "Security Settings"}
              {activeTab === "notifications" && "Notification Settings"}
              {activeTab === "maintenance" && "Maintenance Settings"}
            </CardTitle>
            <CardDescription>
              {activeTab === "general" && "Platform name, support info, and locale settings"}
              {activeTab === "tenant" && "Organization profile and branding"}
              {activeTab === "feature-flags" && `Manage feature availability (${enabledFlags}/${featureFlags.length} enabled)`}
              {activeTab === "security" && "Password policy, MFA, session timeout, and IP allowlist"}
              {activeTab === "notifications" && "Email, push, SMS, and webhook notification channels"}
              {activeTab === "maintenance" && "Data retention, backups, maintenance mode, and system status"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ======== GENERAL ======== */}
            {activeTab === "general" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform Name</label>
                  <input
                    defaultValue="Sentience IoT"
                    disabled={!canManage}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Support Email</label>
                  <input
                    defaultValue="support@sentience.io"
                    disabled={!canManage}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Zone</label>
                  <select
                    defaultValue="UTC"
                    disabled={!canManage}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    <option>UTC</option>
                    <option>America/New_York</option>
                    <option>America/Chicago</option>
                    <option>America/Denver</option>
                    <option>America/Los_Angeles</option>
                    <option>Europe/London</option>
                    <option>Europe/Berlin</option>
                    <option>Asia/Tokyo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Format</label>
                  <select
                    defaultValue="ISO 8601"
                    disabled={!canManage}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    <option>ISO 8601</option>
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                  </select>
                </div>
              </div>
            )}

            {/* ======== TENANT ======== */}
            {activeTab === "tenant" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organization Name</label>
                    <input
                      defaultValue="Sentience Inc."
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organization ID</label>
                    <input
                      defaultValue="org-sentience-001"
                      disabled
                      className="flex h-10 w-full rounded-md border bg-muted px-3 py-2 text-sm outline-none text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Brand Color (Primary)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        defaultValue="#2563eb"
                        disabled={!canManage}
                        className="h-10 w-12 rounded-md border bg-background p-1 cursor-pointer"
                      />
                      <input
                        defaultValue="#2563eb"
                        disabled={!canManage}
                        className="flex h-10 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Support Phone</label>
                    <input
                      defaultValue="+1 (555) 000-1234"
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization Address</label>
                  <textarea
                    defaultValue="123 IoT Street, San Francisco, CA 94105"
                    disabled={!canManage}
                    rows={2}
                    className="flex w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
                  />
                </div>
              </div>
            )}

            {/* ======== FEATURE FLAGS ======== */}
            {activeTab === "feature-flags" && (
              <div className="space-y-3">
                {featureFlags.map((flag) => (
                  <div
                    key={flag.key}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{flag.label}</p>
                        {flag.requiresRestart && (
                          <Badge variant="outline" className="text-[10px]">
                            Restart
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {flag.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs ${flag.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {flag.enabled ? "On" : "Off"}
                      </span>
                      <Toggle
                        enabled={flag.enabled}
                        onToggle={() => toggleFlag(flag.key)}
                        disabled={!canManage}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ======== SECURITY ======== */}
            {activeTab === "security" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Minimum Password Length</label>
                    <input
                      type="number"
                      defaultValue={8}
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      defaultValue={30}
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Require Multi-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Enforce MFA for all users</p>
                  </div>
                  <Toggle enabled={true} onToggle={() => {}} disabled={!canManage} />
                </div>
              </>
            )}

            {/* ======== NOTIFICATIONS ======== */}
            {activeTab === "notifications" && (
              <div className="space-y-4">
                {[
                  { name: "Email Notifications", desc: "Send alert and report emails", enabled: true },
                  { name: "Push Notifications", desc: "Browser push notifications", enabled: true },
                  { name: "SMS Alerts", desc: "Critical alerts via SMS", enabled: false },
                  { name: "Webhook Integrations", desc: "Send events to external webhooks", enabled: false },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle enabled={item.enabled} onToggle={() => {}} disabled={!canManage} />
                  </div>
                ))}
              </div>
            )}

            {/* ======== MAINTENANCE ======== */}
            {activeTab === "maintenance" && (
              <>
                {/* Maintenance mode */}
                <div className={`rounded-lg border p-4 ${maintenanceMode ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${maintenanceMode ? "text-amber-500" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium">Maintenance Mode</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {maintenanceMode
                            ? "System is in maintenance mode. Non-admin users will see a maintenance page."
                            : "Enable to prevent non-admin access during system updates."}
                        </p>
                      </div>
                    </div>
                    <Toggle
                      enabled={maintenanceMode}
                      onToggle={() => setMaintenanceMode((prev) => !prev)}
                      disabled={!canManage}
                    />
                  </div>
                  {maintenanceMode && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Maintenance mode is active — only administrators can access the platform
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Retention (days)</label>
                    <input
                      type="number"
                      defaultValue={90}
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Backup Frequency</label>
                    <select
                      defaultValue="daily"
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      <option>hourly</option>
                      <option>daily</option>
                      <option>weekly</option>
                    </select>
                  </div>
                </div>

                {/* Service status */}
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold mb-2">Service Status</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wifi className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="text-sm font-medium">MQTT Broker Status</p>
                        <p className="text-xs text-muted-foreground">Connected to mosquitto://localhost:1883</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400">
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Database Status</p>
                        <p className="text-xs text-muted-foreground">PostgreSQL 16 — 2.3 GB used</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400">
                      Healthy
                    </Badge>
                  </div>
                </div>
              </>
            )}

            {/* Save button */}
            {canManage && (
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
                {saved && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 animate-fade-in">
                    Settings saved successfully
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  );
}
