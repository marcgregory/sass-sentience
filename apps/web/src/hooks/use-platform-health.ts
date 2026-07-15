/**
 * usePlatformHealth — polls the backend platform health endpoint.
 *
 * Returns real-time health status for all platform services (API, DB,
 * MQTT, Bridge, Simulator) with auto-polling every 15 seconds.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getPlatformHealth } from "@/lib/admin";
import type { PlatformHealthResponse } from "@/lib/admin";

export function usePlatformHealth(refetchIntervalMs = 15_000) {
  return useQuery<PlatformHealthResponse>({
    queryKey: queryKeys.admin.health,
    queryFn: () => getPlatformHealth(),
    refetchInterval: refetchIntervalMs,
    retry: 2,
    retryDelay: 1000,
    staleTime: 10_000,
  });
}
