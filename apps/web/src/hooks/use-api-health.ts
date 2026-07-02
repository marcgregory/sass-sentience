/**
 * useApiHealth — polls the backend API health endpoint.
 *
 * Returns the health status of the API service and database.
 * Designed to feed into Platform Health's "API Service" card.
 */

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ApiHealthResponse {
  status: "ok" | "error";
  uptime: number;
  timestamp: string;
  db: {
    status: "healthy" | "unhealthy";
    latency: string | null;
  };
}

export function useApiHealth(refetchIntervalMs = 15_000) {
  return useQuery({
    queryKey: queryKeys.health.status,
    queryFn: async () => {
      const data = await get<ApiHealthResponse>("/health");
      return data;
    },
    refetchInterval: refetchIntervalMs,
    retry: 2,
    retryDelay: 1000,
    staleTime: 10_000,
  });
}
