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
import {
  Bell,
  BellOff,
  Mail,
  Globe,
  Smartphone,
  MessageSquare,
  Save,
  Loader2,
  AlertTriangle,
  Wifi,
  BatteryWarning,
  Thermometer,
  Cpu,
  Wrench,
  RefreshCw,
} from "lucide-react";
import type { NotificationRule, RuleChannel, RuleAlertType, UserRole } from "@sentience/types";
import { ROLE_META } from "@/lib/permissions";

const channelIcons: Record<RuleChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  web: Globe,
  push: Smartphone,
  sms: MessageSquare,
};

const channelLabels: Record<RuleChannel, string> = {
  email: "Email",
  web: "Web",
  push: "Push",
  sms: "SMS",
};

const alertTypeIcons: Record<RuleAlertType, React.ComponentType<{ className?: string }>> = {
  device_offline: Wifi,
  device_fault: AlertTriangle,
  battery_low: BatteryWarning,
  signal_weak: Wifi,
  temperature_high: Thermometer,
  firmware_update: RefreshCw,
  diagnostic_failure: Wrench,
};

const initialRules: NotificationRule[] = [
  {
    id: "NR-001",
    alertType: "device_offline",
    label: "Device Offline",
    description: "Triggered when a device has been unreachable for 5 minutes",
    severityThreshold: "critical",
    channels: ["email", "web", "push"],
    enabled: true,
    cooldownMinutes: 15,
    rolePreferences: { admin: true, support: true, installer: false, customer: true },
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-06-15T10:00:00Z",
  },
  {
    id: "NR-002",
    alertType: "device_fault",
    label: "Device Fault",
    description: "Triggered when a device reports a hardware or software fault",
    severityThreshold: "critical",
    channels: ["email", "web", "push", "sms"],
    enabled: true,
    cooldownMinutes: 30,
    rolePreferences: { admin: true, support: true, installer: true, customer: true },
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-06-10T14:00:00Z",
  },
  {
    id: "NR-003",
    alertType: "battery_low",
    label: "Low Battery",
    description: "Triggered when device battery drops below 20%",
    severityThreshold: "warning",
    channels: ["email", "web"],
    enabled: true,
    cooldownMinutes: 60,
    rolePreferences: { admin: true, support: true, installer: true, customer: true },
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-06-01T09:00:00Z",
  },
  {
    id: "NR-004",
    alertType: "signal_weak",
    label: "Weak Signal",
    description: "Triggered when device signal strength drops below -85 dBm",
    severityThreshold: "warning",
    channels: ["web", "push"],
    enabled: true,
    cooldownMinutes: 120,
    rolePreferences: { admin: true, support: true, installer: true, customer: false },
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-05-20T11:00:00Z",
  },
  {
    id: "NR-005",
    alertType: "temperature_high",
    label: "High Temperature",
    description: "Triggered when device temperature exceeds 50°C",
    severityThreshold: "warning",
    channels: ["email", "web", "push"],
    enabled: true,
    cooldownMinutes: 30,
    rolePreferences: { admin: true, support: true, installer: true, customer: false },
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-06-12T16:00:00Z",
  },
  {
    id: "NR-006",
    alertType: "firmware_update",
    label: "Firmware Update Available",
    description: "Notification when new firmware is available for devices",
    severityThreshold: "info",
    channels: ["web"],
    enabled: false,
    cooldownMinutes: 1440,
    rolePreferences: { admin: true, support: true, installer: true, customer: false },
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-04-01T08:00:00Z",
  },
  {
    id: "NR-007",
    alertType: "diagnostic_failure",
    label: "Diagnostic Failure",
    description: "Triggered when a device diagnostic test fails",
    severityThreshold: "warning",
    channels: ["email", "web"],
    enabled: true,
    cooldownMinutes: 60,
    rolePreferences: { admin: true, support: true, installer: true, customer: false },
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-05-10T12:00:00Z",
  },
];

const allRoles: UserRole[] = ["admin", "support", "installer", "customer"];

export default function NotificationRulesPage() {
  const [rules, setRules] = useState<NotificationRule[]>(initialRules);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
    );
  };

  const handleToggleChannel = (ruleId: string, channel: RuleChannel) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const channels = r.channels.includes(channel)
          ? r.channels.filter((c) => c !== channel)
          : [...r.channels, channel];
        return { ...r, channels };
      }),
    );
  };

  const handleSeverityChange = (ruleId: string, severity: NotificationRule["severityThreshold"]) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, severityThreshold: severity } : r)),
    );
  };

  const handleRoleToggle = (ruleId: string, role: UserRole) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        return {
          ...r,
          rolePreferences: {
            ...r.rolePreferences,
            [role]: !r.rolePreferences[role],
          },
        };
      }),
    );
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setEditingRule(null);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  const enabledCount = rules.filter((r) => r.enabled).length;

  const Toggle = ({ enabled, onToggle, disabled = false }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      className={`h-6 w-11 shrink-0 rounded-full transition-colors ${
        disabled ? "cursor-default" : "cursor-pointer"
      } ${enabled ? "bg-primary" : "bg-input"}`}
    >
      <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
        enabled ? "translate-x-[22px]" : "translate-x-0.5"
      } ${disabled ? "opacity-50" : ""}`} />
    </button>
  );

  return (
    <RequirePermission resource="admin" action="read">
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Notification Rules"
          description="Configure alert thresholds and notification channels"
        />

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{rules.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{enabledCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Channels Used</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-1">
              {(["email", "web", "push", "sms"] as RuleChannel[]).map((ch) => {
                const count = rules.filter((r) => r.enabled && r.channels.includes(ch)).length;
                const Icon = channelIcons[ch];
                return (
                  <div key={ch} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]">
                    <Icon className="h-3 w-3" />
                    {count}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Rules list */}
        <div className="space-y-4">
          {rules.map((rule) => {
            const isEditing = editingRule === rule.id;
            const AlertIcon = alertTypeIcons[rule.alertType];
            return (
              <Card
                key={rule.id}
                className={`transition-colors ${!rule.enabled ? "opacity-60" : ""} ${isEditing ? "ring-2 ring-primary/30" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        rule.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {rule.enabled ? <AlertIcon className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{rule.label}</CardTitle>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            rule.severityThreshold === "critical" ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400" :
                            rule.severityThreshold === "warning" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400" :
                            "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400"
                          }`}>
                            {rule.severityThreshold.charAt(0).toUpperCase() + rule.severityThreshold.slice(1)}
                          </span>
                        </div>
                        <CardDescription className="mt-0.5">{rule.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {rule.enabled ? "Active" : "Disabled"}
                      </span>
                      <Toggle
                        enabled={rule.enabled}
                        onToggle={() => handleToggleRule(rule.id)}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className={isEditing ? "space-y-4" : ""}>
                  {/* Channel badges (collapsed) */}
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      {rule.channels.map((ch) => {
                        const Icon = channelIcons[ch];
                        return (
                          <Badge key={ch} variant="outline" className="flex items-center gap-1 text-[10px]">
                            <Icon className="h-3 w-3" />
                            {channelLabels[ch]}
                          </Badge>
                        );
                      })}
                      <span className="text-xs text-muted-foreground ml-auto">{rule.cooldownMinutes}min cooldown</span>
                    </div>
                  )}

                  {/* Expanded editor */}
                  {isEditing && (
                    <div className="space-y-4 border-t pt-4">
                      {/* Severity */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Severity Threshold</p>
                        <div className="flex gap-2">
                          {(["critical", "warning", "info"] as const).map((sev) => (
                            <button
                              key={sev}
                              onClick={() => handleSeverityChange(rule.id, sev)}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                rule.severityThreshold === sev
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-input text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {sev.charAt(0).toUpperCase() + sev.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Channels */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Notification Channels</p>
                        <div className="flex flex-wrap gap-2">
                          {(["email", "web", "push", "sms"] as RuleChannel[]).map((ch) => {
                            const active = rule.channels.includes(ch);
                            const Icon = channelIcons[ch];
                            return (
                              <button
                                key={ch}
                                onClick={() => handleToggleChannel(rule.id, ch)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                  active
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-input text-muted-foreground hover:border-primary/50"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {channelLabels[ch]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Role preferences */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Role-Based Preferences</p>
                        <p className="text-[10px] text-muted-foreground mb-2">
                          Select which roles receive notifications for this alert type
                        </p>
                        <div className="flex flex-wrap gap-4">
                          {allRoles.map((role) => {
                            const enabled = rule.rolePreferences[role] ?? false;
                            const meta = ROLE_META[role];
                            return (
                              <label key={role} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={() => handleRoleToggle(rule.id, role)}
                                  className="rounded border-input text-primary focus:ring-primary"
                                />
                                <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cooldown */}
                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Cooldown Period</label>
                          <select
                            value={rule.cooldownMinutes}
                            onChange={(e) => {
                              setRules((prev) =>
                                prev.map((r) =>
                                  r.id === rule.id
                                    ? { ...r, cooldownMinutes: parseInt(e.target.value) }
                                    : r,
                                ),
                              );
                            }}
                            className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value={5}>5 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                            <option value={1440}>24 hours</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit / Collapse button */}
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRule(isEditing ? null : rule.id)}
                      className="text-xs"
                    >
                      {isEditing ? "Collapse" : "Edit Rule"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Save all */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save All Changes
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400 animate-fade-in">
              Notification rules saved successfully
            </span>
          )}
        </div>
      </div>
    </RequirePermission>
  );
}
