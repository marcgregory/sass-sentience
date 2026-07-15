"use client";

import { useState, useMemo, useEffect } from "react";
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
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";
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
  AlertCircle,
} from "lucide-react";
import type { UserRole } from "@sentience/types";
import { usePlatformHealth } from "@/hooks/use-platform-health";

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
  /** If set, this flag maps to a backend setting key */
  settingKey?: string;
}

const defaultFlags: FeatureFlag[] = [
  { key: "live-dashboard", label: "Live Dashboard", description: "Real-time device telemetry dashboard", enabled: true },
  { key: "advanced-diagnostics", label: "Advanced Diagnostics", description: "Detailed device diagnostic tools", enabled: true },
  { key: "csv-export", label: "CSV Export", description: "Export reports and audit logs to CSV", enabled: true, settingKey: "csv_export_enabled" },
  { key: "dark-mode-toggle", label: "Dark Mode Toggle", description: "Allow users to switch between light and dark themes", enabled: true },
  { key: "report-scheduling", label: "Report Scheduling", description: "Schedule recurring report generation", enabled: false },
  { key: "mfa-enforcement", label: "MFA Enforcement", description: "Require multi-factor authentication for all users", enabled: false, settingKey: "mfa_enabled" },
  { key: "webhook-integrations", label: "Webhook Integrations", description: "Send events to external webhook endpoints", enabled: false },
  { key: "bulk-operations", label: "Bulk Operations", description: "Perform bulk device operations (update, delete, reboot)", enabled: false },
];

// ---- Notification channels ----
interface NotificationChannel {
  name: string;
  description: string;
  enabled: boolean;
}

const defaultChannels: NotificationChannel[] = [
  { name: "Email Notifications", description: "Send alert and report emails", enabled: true },
  { name: "Push Notifications", description: "Browser push notifications", enabled: true },
  { name: "SMS Alerts", description: "Critical alerts via SMS", enabled: false },
  { name: "Webhook Integrations", description: "Send events to external webhooks", enabled: false },
];

// ---- Tenant info (no backend storage) ----
interface TenantInfo {
  orgName: string;
  orgId: string;
  brandColor: string;
  supportPhone: string;
  address: string;
}

const defaultTenant: TenantInfo = {
  orgName: "Sentience Inc.",
  orgId: "org-sentience-001",
  brandColor: "#2563eb",
  supportPhone: "+1 (555) 000-1234",
  address: "123 IoT Street, San Francisco, CA 94105",
};

export default function SettingsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // ─── API state ───────────────────────────────────────────────────────
  const { settings, isLoading, isError, error, refetch } = useSettings();
  const updateSetting = useUpdateSetting();
  const { data: platformHealth } = usePlatformHealth(30_000);

  // ─── Local form state ────────────────────────────────────────────────
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("support@sentience.io");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("ISO 8601");
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [dataRetentionDays, setDataRetentionDays] = useState(90);
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(defaultFlags);
  const [tenant, setTenant] = useState<TenantInfo>(defaultTenant);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>(defaultChannels);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Hydrate local state from API settings ───────────────────────────
  useEffect(() => {
    if (!isLoading && settings.length > 0) {
      const getSetting = (key: string) => {
        const s = settings.find((s) => s.key === key);
        return s?.value as string | number | boolean | undefined;
      };

      // General
      const pn = getSetting("platform_name");
      if (typeof pn === "string") setPlatformName(pn);
      const tz = getSetting("timezone");
      if (typeof tz === "string") setTimezone(tz);

      // Security
      const pw = getSetting("password_min_length");
      if (typeof pw === "number") setPasswordMinLength(pw);
      const st = getSetting("session_timeout_minutes");
      if (typeof st === "number") setSessionTimeout(st);
      const mfa = getSetting("mfa_enabled");
      if (typeof mfa === "boolean") setMfaEnabled(mfa);

      // Maintenance
      const dr = getSetting("data_retention_days");
      if (typeof dr === "number") setDataRetentionDays(dr);
      const mm = getSetting("maintenance_mode");
      if (typeof mm === "boolean") setMaintenanceMode(mm);

      // General — additional fields
      const se = getSetting("support_email");
      if (typeof se === "string") setSupportEmail(se);
      const df = getSetting("date_format");
      if (typeof df === "string") setDateFormat(df);

      // Maintenance — additional fields
      const bf = getSetting("backup_frequency");
      if (typeof bf === "string") setBackupFrequency(bf);

      // Notification channels — merge API-backed values
      const notifEmail = getSetting("notification_email");
      const notifPush = getSetting("notification_push");
      const notifSms = getSetting("notification_sms");
      const notifWebhook = getSetting("notification_webhook");
      setNotificationChannels((prev) =>
        prev.map((c) => {
          if (c.name === "Email Notifications" && typeof notifEmail === "boolean") return { ...c, enabled: notifEmail };
          if (c.name === "Push Notifications" && typeof notifPush === "boolean") return { ...c, enabled: notifPush };
          if (c.name === "SMS Alerts" && typeof notifSms === "boolean") return { ...c, enabled: notifSms };
          if (c.name === "Webhook Integrations" && typeof notifWebhook === "boolean") return { ...c, enabled: notifWebhook };
          return c;
        }),
      );

      // Tenant fields
      const orgName = getSetting("tenant_org_name");
      if (typeof orgName === "string") setTenant((prev) => ({ ...prev, orgName }));
      const brandColor = getSetting("tenant_brand_color");
      if (typeof brandColor === "string") setTenant((prev) => ({ ...prev, brandColor }));
      const supportPhone = getSetting("tenant_support_phone");
      if (typeof supportPhone === "string") setTenant((prev) => ({ ...prev, supportPhone }));
      const address = getSetting("tenant_address");
      if (typeof address === "string") setTenant((prev) => ({ ...prev, address }));

      // Feature flags — merge API-backed values into defaults
      const csvExport = getSetting("csv_export_enabled");
      setFeatureFlags((prev) =>
        prev.map((f) => {
          if (f.settingKey === "csv_export_enabled" && typeof csvExport === "boolean") {
            return { ...f, enabled: csvExport };
          }
          if (f.settingKey === "mfa_enabled" && typeof mfa === "boolean") {
            return { ...f, enabled: mfa };
          }
          return f;
        }),
      );
    }
  }, [isLoading, settings]);

  const canManage = hasPermission(currentUser?.role, "settings", "manage");

  const enabledFlags = useMemo(() => featureFlags.filter((f) => f.enabled).length, [featureFlags]);

  // ─── Save handler ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    // Collect changed settings to persist
    const updates: { key: string; value: unknown }[] = [];

    const currentSetting = (key: string) => settings.find((s) => s.key === key);

    const changed = (key: string, value: unknown) => {
      const cur = currentSetting(key);
      if (!cur || JSON.stringify(cur.value) !== JSON.stringify(value)) {
        updates.push({ key, value });
      }
    };

    // General
    changed("platform_name", platformName);
    changed("timezone", timezone);
    changed("support_email", supportEmail);
    changed("date_format", dateFormat);

    // Security
    changed("password_min_length", passwordMinLength);
    changed("session_timeout_minutes", sessionTimeout);
    changed("mfa_enabled", mfaEnabled);

    // Maintenance
    changed("data_retention_days", dataRetentionDays);
    changed("maintenance_mode", maintenanceMode);
    changed("backup_frequency", backupFrequency);

    // Notification channels
    changed("notification_email", notificationChannels.find((c) => c.name === "Email Notifications")?.enabled ?? true);
    changed("notification_push", notificationChannels.find((c) => c.name === "Push Notifications")?.enabled ?? true);
    changed("notification_sms", notificationChannels.find((c) => c.name === "SMS Alerts")?.enabled ?? false);
    changed("notification_webhook", notificationChannels.find((c) => c.name === "Webhook Integrations")?.enabled ?? false);

    // Tenant fields
    changed("tenant_org_name", tenant.orgName);
    changed("tenant_brand_color", tenant.brandColor);
    changed("tenant_support_phone", tenant.supportPhone);
    changed("tenant_address", tenant.address);

    // Feature flags with backend storage
    changed("csv_export_enabled", featureFlags.find((f) => f.key === "csv-export")?.enabled ?? false);
    changed("mfa_enabled", featureFlags.find((f) => f.key === "mfa-enforcement")?.enabled ?? false);

    if (updates.length > 0) {
      // Persist all changed settings via parallel mutations
      try {
        await Promise.all(
          updates.map((u) => updateSetting.mutateAsync(u)),
        );
      } catch {
        setSaveError("Failed to save some settings. Please try again.");
        setSaving(false);
        return;
      }
    }

    // Brief delay when nothing changed so the spinner isn't instant
    if (updates.length === 0) {
      await new Promise((r) => setTimeout(r, 300));
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleFlag = (key: string) => {
    setFeatureFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  const toggleChannel = (name: string) => {
    setNotificationChannels((prev) =>
      prev.map((c) => (c.name === name ? { ...c, enabled: !c.enabled } : c)),
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

  // ─── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <RequirePermission resource="settings" action="read">
        <div className="space-y-6 animate-fade-in">
          <PageHeader title="Settings" description="Configure platform settings and preferences" />
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading settings…</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </RequirePermission>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────
  if (isError) {
    return (
      <RequirePermission resource="settings" action="read">
        <div className="space-y-6 animate-fade-in">
          <PageHeader title="Settings" description="Configure platform settings and preferences" />
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div className="text-center">
                <p className="font-medium text-destructive">Failed to load settings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : "Could not reach the API server."}
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </RequirePermission>
    );
  }

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
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    disabled={!canManage}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Support Email</label>
                  <input
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    disabled={!canManage}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Zone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
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
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
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
                      value={tenant.orgName}
                      onChange={(e) => setTenant((prev) => ({ ...prev, orgName: e.target.value }))}
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organization ID</label>
                    <input
                      value={tenant.orgId}
                      disabled
                      className="flex h-10 w-full rounded-md border bg-muted px-3 py-2 text-sm outline-none text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Brand Color (Primary)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={tenant.brandColor}
                        onChange={(e) => setTenant((prev) => ({ ...prev, brandColor: e.target.value }))}
                        disabled={!canManage}
                        className="h-10 w-12 rounded-md border bg-background p-1 cursor-pointer"
                      />
                      <input
                        value={tenant.brandColor}
                        onChange={(e) => setTenant((prev) => ({ ...prev, brandColor: e.target.value }))}
                        disabled={!canManage}
                        className="flex h-10 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Support Phone</label>
                    <input
                      value={tenant.supportPhone}
                      onChange={(e) => setTenant((prev) => ({ ...prev, supportPhone: e.target.value }))}
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization Address</label>
                  <textarea
                    value={tenant.address}
                    onChange={(e) => setTenant((prev) => ({ ...prev, address: e.target.value }))}
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
                        {flag.settingKey && (
                          <Badge variant="secondary" className="text-[10px]">
                            Persistent
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
                      value={passwordMinLength}
                      min={4}
                      max={128}
                      onChange={(e) => setPasswordMinLength(Number(e.target.value))}
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={sessionTimeout}
                      min={1}
                      max={1440}
                      onChange={(e) => setSessionTimeout(Number(e.target.value))}
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
                  <Toggle
                    enabled={mfaEnabled}
                    onToggle={() => setMfaEnabled((prev) => !prev)}
                    disabled={!canManage}
                  />
                </div>
              </>
            )}

            {/* ======== NOTIFICATIONS ======== */}
            {activeTab === "notifications" && (
              <div className="space-y-4">
                {notificationChannels.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    <Toggle
                      enabled={item.enabled}
                      onToggle={() => toggleChannel(item.name)}
                      disabled={!canManage}
                    />
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
                      value={dataRetentionDays}
                      min={1}
                      max={3650}
                      onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                      disabled={!canManage}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Backup Frequency</label>
                    <select
                      value={backupFrequency}
                      onChange={(e) => setBackupFrequency(e.target.value)}
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
                      <Wifi className={`h-5 w-5 ${platformHealth ? "text-emerald-500" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium">MQTT Broker</p>
                        <p className="text-xs text-muted-foreground">
                          {platformHealth
                            ? (() => {
                                const mqtt = platformHealth.services.find((s) => s.id === "mqtt");
                                return mqtt?.metrics.find((m) => m.label === "Host")?.value ?? "Checking...";
                              })()
                            : "Checking..."}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      platformHealth
                        ? (() => {
                            const mqtt = platformHealth.services.find((s) => s.id === "mqtt");
                            if (!mqtt) return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
                            return mqtt.status === "healthy"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400";
                          })()
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                    }>
                      {platformHealth
                        ? (() => {
                            const mqtt = platformHealth.services.find((s) => s.id === "mqtt");
                            if (!mqtt) return "Checking...";
                            return mqtt.status === "healthy" ? "Online" : "Offline";
                          })()
                        : "Checking..."}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className={`h-5 w-5 ${platformHealth ? "text-blue-500" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium">Database</p>
                        <p className="text-xs text-muted-foreground">
                          {platformHealth
                            ? (() => {
                                const db = platformHealth.services.find((s) => s.id === "database");
                                const storage = db?.metrics.find((m) => m.label === "Storage")?.value;
                                return storage ? `PostgreSQL 16 — ${storage} used` : "Checking...";
                              })()
                            : "Checking..."}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      platformHealth
                        ? (() => {
                            const db = platformHealth.services.find((s) => s.id === "database");
                            if (!db) return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
                            return db.status === "healthy"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400";
                          })()
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
                    }>
                      {platformHealth
                        ? (() => {
                            const db = platformHealth.services.find((s) => s.id === "database");
                            if (!db) return "Checking...";
                            return db.status === "healthy" ? "Healthy" : "Unhealthy";
                          })()
                        : "Checking..."}
                    </Badge>
                  </div>
                </div>
              </>
            )}

            {/* Save feedback */}
            {saveError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {saveError}
              </div>
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
