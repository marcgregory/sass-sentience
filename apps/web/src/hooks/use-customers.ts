/**
 * Customer TanStack Query hooks.
 *
 * Provides hooks for fetching customer data from the backend API.
 * Never call API functions directly from components — use these hooks instead.
 */

import { useQuery } from "@tanstack/react-query";
import { getCustomers } from "@/lib/customers";
import { queryKeys } from "@/lib/query-keys";

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: getCustomers,
    staleTime: 120_000, // customers rarely change
  });
}
