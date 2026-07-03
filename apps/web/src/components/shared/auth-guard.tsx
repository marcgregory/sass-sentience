"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for Zustand persist rehydration before deciding to redirect.
    // On page refresh the persisted state loads asynchronously, so without
    // this check AuthGuard sees isAuthenticated=false on first render and
    // immediately sends the user to /login.
    if (!hasHydrated || isLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, hasHydrated, router]);

  if (isLoading || !hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
