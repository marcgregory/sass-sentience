"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useMfaVerify } from "@/hooks/use-auth-account";
import type { UserRole } from "@sentience/types";
import { Loader2 as Spinner } from "lucide-react";

function MFAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mfaToken = searchParams.get("token") ?? undefined;
  const { loginAsRole } = useAuthStore();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [localError, setLocalError] = useState<string | null>(null);

  const verifyMutation = useMfaVerify();

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setLocalError(null);

    // Auto-focus next input
    if (value && index < 5) {
      const next = document.getElementById(`mfa-${index + 1}`);
      next?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prev = document.getElementById(`mfa-${index - 1}`);
      prev?.focus();
    }
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const fullCode = code.join("");

      if (fullCode.length !== 6) {
        setLocalError("Please enter all 6 digits.");
        return;
      }

      verifyMutation.mutate(
        { code: fullCode, mfaToken },
        {
          onSuccess: (response) => {
            if (response.token && response.user) {
              // Store user + token in auth store directly
              useAuthStore.setState({
                user: {
                  id: response.user!.id,
                  email: response.user!.email,
                  name: response.user!.name,
                  role: response.user!.role as UserRole,
                  isActive: response.user!.isActive,
                  mfaEnabled: response.user!.mfaEnabled,
                  avatar: response.user!.avatar,
                  lastLogin: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                token: response.token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              router.push("/dashboard");
            }
          },
          onError: (err) => {
            // Clear code inputs on error
            setCode(["", "", "", "", "", ""]);
            document.getElementById("mfa-0")?.focus();
            setLocalError(
              err instanceof Error
                ? err.message
                : "Invalid code. Please try again.",
            );
          },
        },
      );
    },
    [code, mfaToken, verifyMutation, router],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Two-factor authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  id={`mfa-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="flex h-12 w-12 items-center justify-center rounded-md border bg-background text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  autoFocus={i === 0}
                  disabled={verifyMutation.isPending}
                />
              ))}
            </div>

            {localError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{localError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={code.some((d) => !d) || verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Verify
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <button type="button" className="text-primary hover:underline">
                Use recovery code
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MFAPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900">
          <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MFAForm />
    </Suspense>
  );
}
