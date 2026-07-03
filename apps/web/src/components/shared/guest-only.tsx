"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";

interface GuestOnlyProps {
  children: React.ReactNode;
}

/**
 * GuestOnly redirects authenticated users away from guest-only pages (login,
 * forgot-password, etc.) to /dashboard.
 *
 * It waits for Zustand persist hydration before deciding, so it never flashes
 * the login page momentarily when a valid session exists in localStorage.
 */
export function GuestOnly({ children }: GuestOnlyProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubFinish = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubFinish();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, hydrated, router]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
