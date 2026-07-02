"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Server data is considered stale after 30 seconds.
        // The real-time layer (Socket.IO) invalidates keys on push events,
        // so staleTime can be generous — most updates arrive via socket.
        staleTime: 30_000,
        // Retry once on failure (network hiccup, transient server error).
        retry: 1,
        // Don't refetch on window refocus when staleTime hasn't expired.
        refetchOnWindowFocus: false,
        // Retry with a short delay.
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always create a new client to avoid cross-request state leaks.
    return makeQueryClient();
  }
  // Browser: reuse the same client across renders.
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
