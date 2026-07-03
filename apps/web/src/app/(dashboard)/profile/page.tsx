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
import { useAuthStore } from "@/stores/auth-store";
import { useAuditStore } from "@/stores/audit-store";
import { hasPermission, ROLE_META } from "@/lib/permissions";
import { formatRelativeTime } from "@sentience/utils";
import {
  User,
  Shield,
  Key,
  Bell,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
} from "lucide-react";

export default function ProfilePage() {
  const { user, getDisplayRole } = useAuthStore();
  const addAuditEntry = useAuditStore((s) => s.addEntry);
  const canEdit = hasPermission(user?.role, "profile", "update");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (!user) return null;

  const meta = ROLE_META[user.role];
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handleSaveProfile = () => {
    if (!canEdit) return;
    setSaving(true);
    setSaveError(null);
    try {
      const oldName = user.name;
      useAuthStore.getState().setUser({ ...user, name, email, updatedAt: new Date().toISOString() });
      addAuditEntry({
        userId: user.id,
        userName: name,
        userRole: user.role,
        action: "update",
        resource: "Profile",
        resourceId: user.id,
        description: oldName !== name
          ? `Updated profile name from "${oldName}" to "${name}"`
          : "Updated profile email",
      });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaving(false);
      setSaveError((err as Error).message ?? "Failed to save profile");
    }
  };

  const handleChangePassword = () => {
    if (!canEdit || !currentPassword || !newPassword || newPassword !== confirmPassword) return;
    setSaving(true);
    setSaveError(null);
    try {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addAuditEntry({
        userId: user.id,
        userName: name,
        userRole: user.role,
        action: "update",
        resource: "Profile",
        resourceId: user.id,
        description: "Password changed",
      });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaving(false);
      setSaveError((err as Error).message ?? "Failed to change password");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Profile" description="Manage your account settings" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Avatar card */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {initials}
            </div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
            <div className="mt-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${meta.bgColor} ${meta.color}`}>
                {getDisplayRole()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-muted p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{user.id}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">MFA</span>
                <span className={user.mfaEnabled ? "text-emerald-600" : "text-muted-foreground"}>
                  {user.mfaEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{formatRelativeTime(user.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Login</span>
                <span>{user.lastLogin ? formatRelativeTime(user.lastLogin) : "Never"}</span>
              </div>
            </div>
            {canEdit && (
              <Button variant="outline" className="w-full">
                <Smartphone className="h-4 w-4" />
                Enable MFA
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="profile-name">Full Name</label>
                  <input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canEdit}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="profile-email">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!canEdit}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
              </div>
              {saveError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  {saveError}
                </div>
              )}
              {canEdit && (
                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save Changes
                  </Button>
                  {saved && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 animate-fade-in">
                      Profile updated
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={!canEdit}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    placeholder="Enter current password"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={!canEdit}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    placeholder="New password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={!canEdit}
                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
                      confirmPassword && newPassword !== confirmPassword
                        ? "border-red-500 focus:ring-red-500"
                        : "border-input"
                    }`}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
              {canEdit && (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleChangePassword}
                    disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  >
                    <Key className="h-4 w-4" />
                    Update Password
                  </Button>
                  <Button variant="outline">
                    <Smartphone className="h-4 w-4" />
                    Enable MFA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Critical Alerts", desc: "Immediate notifications for critical device alerts", channel: "email, push", enabled: true },
                { name: "Weekly Reports", desc: "Weekly summary reports", channel: "email", enabled: true },
                { name: "Firmware Updates", desc: "When new firmware is available for your devices", channel: "email, push", enabled: false },
                { name: "System Announcements", desc: "Platform maintenance and feature updates", channel: "email", enabled: true },
              ].map((pref) => (
                <div key={pref.name} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{pref.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pref.desc}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">via {pref.channel}</p>
                  </div>
                  <div className={`h-6 w-11 rounded-full transition-colors cursor-pointer ${pref.enabled ? "bg-primary" : "bg-input"}`}>
                    <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      pref.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                    }`} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
