import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getAdminStats } from "@/lib/admin";

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => getAdminStats(),
  });
}
