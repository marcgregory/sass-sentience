"use client";

import { useState } from "react";
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
  Settings,
  Globe,
  Shield,
  Bell,
  Key,
  Palette,
  Database,
  RefreshCw,
  Wifi,
  Save,
  Loader2,
} from "lucide-react";

type SettingsTab = "general" | "security" | "notifications" | "maintenance";

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "general", label: "General", icon: Globe },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "maintenance", label: "Maintenance", icon: RefreshCw },
];

export default function SettingsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canManage = hasPermission(currentUser?.role, "settings", "manage");

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  return (
    <RequirePermission resource="settings" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Settings"
          description="Configure platform settings and preferences"
        />

        {/* Tab bar */}
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
            <CardTitle className="text-lg capitalize">{activeTab === "general" ? "General Settings" : activeTab === "security" ? "Security Settings" : activeTab === "notifications" ? "Notification Settings" : "Maintenance Settings"}</CardTitle>
            <CardDescription>
              {activeTab === "general" && "Platform name, branding, and locale settings"}
              {activeTab === "security" && "Password policy, MFA, session timeout, and IP allowlist"}
              {activeTab === "notifications" && "Email, push, SMS, and webhook notification channels"}
              {activeTab === "maintenance" && "Data retention, backups, broker status, and system updates"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeTab === "general" && (
              <>
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
              </>
            )}

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
                  <div className={`h-6 w-11 rounded-full transition-colors ${
                    canManage ? "cursor-pointer" : "cursor-default"
                  } ${true ? "bg-primary" : "bg-input"}`}>
                    <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      true ? "translate-x-[22px]" : "translate-x-0.5"
                    } ${!canManage ? "opacity-50" : ""}`} />
                  </div>
                </div>
              </>
            )}

            {activeTab === "notifications" && (
              <>
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
                      <div className={`h-6 w-11 rounded-full transition-colors ${
                        canManage ? "cursor-pointer" : "cursor-default"
                      } ${item.enabled ? "bg-primary" : "bg-input"}`}>
                        <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          item.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                        } ${!canManage ? "opacity-50" : ""}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "maintenance" && (
              <>
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
                <div className="rounded-lg border p-4 space-y-3">
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
