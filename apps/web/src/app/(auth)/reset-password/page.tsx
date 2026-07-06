"use client";

import { useState, useCallback, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Key, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useResetPassword } from "@/hooks/use-auth-account";
import { Loader2 as Spinner } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use a ref that we re-sync on every render.  On submit we will read
  // window.location.search directly as a fallback so React's stale route-
  // cache cannot hide a URL-bar edit made moments before clicking submit.
  const tokenRef = useRef<string | null>(null);

  // Sync from React cache on each render (catches client-side nav).
  tokenRef.current = searchParams.get("token");

  function getToken(): string | null {
    // Primary: read the browser location directly.  This covers the case
    // where the user typed in the URL bar and clicked submit without the
    // Next.js router having processed the change.  window.location always
    // reflects the current URL regardless of React's re-render state.
    if (typeof window !== "undefined") {
      const fromLocation = new URLSearchParams(
        window.location.search,
      ).get("token");
      if (fromLocation) return fromLocation;
    }

    // Fallback: React's searchParams (catches programmatic navigation).
    return searchParams.get("token") ?? null;
  }

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const resetMutation = useResetPassword();

  // Reset form state when the URL token actually changes (back/forward nav)
  useEffect(() => {
    setSuccess(false);
    setLocalError(null);
  }, [searchParams.get("token")]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError(null);

      // Read token at SUBMIT TIME, directly from browser location.
      // This intentionally bypasses React's searchParams cache to catch
      // URL-bar edits made without pressing Enter (which never produce a
      // React re-render, so any cached value is stale).
      const currentToken = getToken();

      if (!currentToken) {
        setLocalError("Invalid or missing reset token.");
        return;
      }

      if (password.length < 8) {
        setLocalError("Password must be at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }

      resetMutation.mutate(
        { token: currentToken, password },
        {
          onSuccess: () => {
            setSuccess(true);
          },
          onError: (err) => {
            setLocalError(
              err instanceof Error ? err.message : "Failed to reset password. The link may have expired.",
            );
          },
        },
      );
    },
    [password, confirmPassword, resetMutation],
  );

  // No token in URL
  const token = searchParams.get("token");
  if (!token && !success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Invalid Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">
              Please request a new password reset link.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Request new link
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>
            {success
              ? "Your password has been reset successfully."
              : "Enter your new password below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                You can now sign in with your new password.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push("/login")}
              >
                Sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLocalError(null);
                    }}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring pr-10"
                    required
                    minLength={8}
                    disabled={resetMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setLocalError(null);
                  }}
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
                    confirmPassword && password !== confirmPassword
                      ? "border-red-500 focus:ring-red-500"
                      : ""
                  }`}
                  required
                  disabled={resetMutation.isPending}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              {localError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{localError}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Reset Password
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900">
          <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
