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
  AlertCircle,
  QrCode,
  X,
} from "lucide-react";
import {
  useUpdateProfile,
  useChangePassword,
  useMfaSetup,
  useMfaVerify,
  useMfaDisable,
} from "@/hooks/use-auth-account";

export default function ProfilePage() {
  const { user, getDisplayRole } = useAuthStore();
  const addAuditEntry = useAuditStore((s) => s.addEntry);
  const canEdit = hasPermission(user?.role, "profile", "update");

  // ─── Personal Info state ──────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const updateProfileMutation = useUpdateProfile();

  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ─── Password state ───────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const changePasswordMutation = useChangePassword();
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  // ─── MFA state ────────────────────────────────────────────────────
  const mfaSetupMutation = useMfaSetup();
  const mfaVerifyMutation = useMfaVerify();
  const mfaDisableMutation = useMfaDisable();

  const [mfaPassword, setMfaPassword] = useState("");
  const [mfaStep, setMfaStep] = useState<"idle" | "setup_secret" | "verify">("idle");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaOtpauth, setMfaOtpauth] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaDisablePassword, setMfaDisablePassword] = useState("");
  const [mfaDisableCode, setMfaDisableCode] = useState("");

  if (!user) return null;

  const meta = ROLE_META[user.role];
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleSaveProfile = () => {
    if (!canEdit) return;
    setProfileError(null);
    setProfileSaved(false);

    updateProfileMutation.mutate(
      { name, email },
      {
        onSuccess: () => {
          useAuthStore.getState().setUser({
            ...user,
            name,
            email,
            updatedAt: new Date().toISOString(),
          });
          addAuditEntry({
            userId: user.id,
            userName: name,
            userRole: user.role,
            action: "update",
            resource: "Profile",
            resourceId: user.id,
            description: "Updated profile information",
          });
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 3000);
        },
        onError: (err) => {
          setProfileError(err instanceof Error ? err.message : "Failed to save profile");
        },
      },
    );
  };

  const handleChangePassword = () => {
    if (!canEdit || !currentPassword || !newPassword || newPassword !== confirmPassword) return;
    setPwError(null);
    setPwSaved(false);

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
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
          setPwSaved(true);
          setTimeout(() => setPwSaved(false), 3000);
        },
        onError: (err) => {
          setPwError(err instanceof Error ? err.message : "Failed to change password");
        },
      },
    );
  };

  const handleMfaSetup = () => {
    if (!mfaPassword) return;
    setMfaError(null);

    mfaSetupMutation.mutate(
      { password: mfaPassword },
      {
        onSuccess: (response) => {
          setMfaSecret(response.secret);
          setMfaOtpauth(response.otpauth);
          setMfaStep("setup_secret");
        },
        onError: (err) => {
          setMfaError(err instanceof Error ? err.message : "Failed to set up MFA");
        },
      },
    );
  };

  const handleMfaVerify = () => {
    if (!mfaCode || mfaCode.length !== 6) return;
    setMfaError(null);

    mfaVerifyMutation.mutate(
      { code: mfaCode },
      {
        onSuccess: () => {
          useAuthStore.getState().setUser({
            ...user,
            mfaEnabled: true,
          });
          setMfaStep("idle");
          setMfaPassword("");
          setMfaCode("");
          setMfaSecret("");
          setMfaOtpauth("");
          addAuditEntry({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: "update",
            resource: "Profile",
            resourceId: user.id,
            description: "MFA enabled",
          });
        },
        onError: (err) => {
          setMfaError(err instanceof Error ? err.message : "Invalid code. Try again.");
        },
      },
    );
  };

  const handleMfaDisable = () => {
    if (!mfaDisablePassword) return;
    setMfaError(null);

    mfaDisableMutation.mutate(
      { password: mfaDisablePassword, code: mfaDisableCode || undefined },
      {
        onSuccess: () => {
          useAuthStore.getState().setUser({
            ...user,
            mfaEnabled: false,
          });
          setMfaDisablePassword("");
          setMfaDisableCode("");
          addAuditEntry({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: "update",
            resource: "Profile",
            resourceId: user.id,
            description: "MFA disabled",
          });
        },
        onError: (err) => {
          setMfaError(err instanceof Error ? err.message : "Failed to disable MFA");
        },
      },
    );
  };

  const mfaSaving =
    mfaSetupMutation.isPending ||
    mfaVerifyMutation.isPending ||
    mfaDisableMutation.isPending;

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
                    disabled={!canEdit || updateProfileMutation.isPending}
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
                    disabled={!canEdit || updateProfileMutation.isPending}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
              </div>
              {profileError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}
              {canEdit && (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                  {profileSaved && (
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
              {/* Change Password */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Change Password</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPwError(null);
                      }}
                      disabled={!canEdit || changePasswordMutation.isPending}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      placeholder="Enter current password"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      type="button"
                      tabIndex={-1}
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
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPwError(null);
                      }}
                      disabled={!canEdit || changePasswordMutation.isPending}
                      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      placeholder="New password (min 8 chars)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPwError(null);
                      }}
                      disabled={!canEdit || changePasswordMutation.isPending}
                      className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
                        confirmPassword && newPassword !== confirmPassword
                          ? "border-red-500 focus:ring-red-500"
                          : ""
                      }`}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {pwError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{pwError}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleChangePassword}
                    disabled={
                      !canEdit ||
                      !currentPassword ||
                      !newPassword ||
                      newPassword !== confirmPassword ||
                      changePasswordMutation.isPending
                    }
                  >
                    {changePasswordMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4" />
                    )}
                    Update Password
                  </Button>
                  {pwSaved && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 animate-fade-in">
                      Password changed
                    </span>
                  )}
                </div>
              </div>

              <hr className="border-border" />

              {/* MFA Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">
                  Two-Factor Authentication (MFA)
                </h4>

                {mfaError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{mfaError}</span>
                  </div>
                )}

                {user.mfaEnabled ? (
                  /* MFA is enabled — show disable form */
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">MFA is currently enabled</span>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Enter password to disable
                      </label>
                      <input
                        type="password"
                        value={mfaDisablePassword}
                        onChange={(e) => {
                          setMfaDisablePassword(e.target.value);
                          setMfaError(null);
                        }}
                        placeholder="Current password"
                        disabled={mfaSaving}
                        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Authenticator code (optional)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={mfaDisableCode}
                        onChange={(e) => {
                          setMfaDisableCode(e.target.value);
                          setMfaError(null);
                        }}
                        placeholder="000000"
                        disabled={mfaSaving}
                        className="flex h-10 w-16 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleMfaDisable}
                      disabled={mfaSaving || !mfaDisablePassword}
                    >
                      {mfaDisableMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Disable MFA
                    </Button>
                  </div>
                ) : mfaStep === "setup_secret" ? (
                  /* Step 2: Show secret and verify */
                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Scan the QR code or enter the secret key manually in your
                      authenticator app, then enter the 6-digit code below.
                    </p>
                    <div className="flex flex-col items-center gap-2">
                      {mfaOtpauth && (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaOtpauth)}`}
                          alt="MFA QR Code"
                          className="rounded-lg border"
                          width={200}
                          height={200}
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Or enter secret: <code className="rounded bg-muted px-1 font-mono">{mfaSecret}</code>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Verification Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) => {
                            setMfaCode(e.target.value);
                            setMfaError(null);
                          }}
                          placeholder="000000"
                          disabled={mfaSaving}
                          className="flex h-10 w-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        />
                        <Button
                          size="sm"
                          onClick={handleMfaVerify}
                          disabled={
                            mfaSaving || mfaCode.length !== 6
                          }
                        >
                          {mfaVerifyMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Verify & Enable
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MFA is not enabled — show setup form */
                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication adds an extra layer of security
                      to your account. Enable it to require a 6-digit code from
                      your authenticator app when signing in.
                    </p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Enter your password to begin setup
                      </label>
                      <input
                        type="password"
                        value={mfaPassword}
                        onChange={(e) => {
                          setMfaPassword(e.target.value);
                          setMfaError(null);
                        }}
                        placeholder="Current password"
                        disabled={mfaSaving}
                        className="flex h-10 w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleMfaSetup}
                      disabled={mfaSaving || !mfaPassword}
                    >
                      {mfaSetupMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      Set up MFA
                    </Button>
                  </div>
                )}
              </div>
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
