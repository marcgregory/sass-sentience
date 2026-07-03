"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Loader2, Shield, Users, Wrench, Eye as EyeIcon } from "lucide-react";
import type { UserRole } from "@sentience/types";
import { ROLE_META } from "@/lib/permissions";

const roleIcons: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  support: Users,
  installer: Wrench,
  customer: EyeIcon,
};

const quickAccounts: { role: UserRole; email: string }[] = [
  { role: "admin", email: "admin@sentience.io" },
  { role: "support", email: "support@sentience.io" },
  { role: "installer", email: "installer@sentience.io" },
  { role: "customer", email: "customer@sentience.io" },
];

const DEMO_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsRole, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    router.push("/dashboard");
  };

  const handleQuickLogin = (role: UserRole) => {
    loginAsRole(role);
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-xl font-bold text-primary-foreground">S</span>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your Sentience account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick role login cards (dev/demo only) */}
          {DEMO_LOGIN_ENABLED && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground text-center">
                Quick demo login — pick a role
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickAccounts.map(({ role, email }) => {
                  const meta = ROLE_META[role];
                  const Icon = roleIcons[role];
                  return (
                    <button
                      key={role}
                      onClick={() => handleQuickLogin(role)}
                      disabled={isLoading}
                      className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.bgColor}`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <span className="text-xs font-medium">{meta.label}</span>
                      <span className="text-[10px] text-muted-foreground">{email}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {DEMO_LOGIN_ENABLED && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or sign in with email
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none"
                >
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="remember" className="text-sm text-muted-foreground">
                Remember me
              </label>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            {DEMO_LOGIN_ENABLED && (
              <p className="text-center text-xs text-muted-foreground">
                Demo: use quick login buttons above for instant access
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
