"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MFAPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      const next = document.getElementById(`mfa-${index + 1}`);
      next?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

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
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  className="flex h-12 w-12 items-center justify-center rounded-md border bg-background text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-ring"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={code.some((d) => !d)}>
              Verify
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
