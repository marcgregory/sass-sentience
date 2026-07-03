"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Zustand 5 persist hydrates asynchronously. The store's initial state
    // has isAuthenticated=false, token=null, user=null until localStorage is
    // read. We use the persist middleware's onFinishHydration callback to
    // know when that's done before deciding whether to redirect.
    const unsubFinish = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If hydration already completed before this effect ran, mark it now.
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubFinish();
    };
  }, []);

  useEffect(() => {
    if (!hydrated || isLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, hydrated, router]);

  if (isLoading || !hydrated) {
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
