import { useQuery } from "@tanstack/react-query";

import { useOrg } from "@/features/org/hooks/use-org";
import { fetchPendingTasks } from "@/features/tasks/api/tasks-api";
import { tasksListQueryKey } from "@/shared/utils/query-keys";

/**
 * Pending work for the selected organization. Keyed under `tasksListQueryKey`, which
 * every task mutation invalidates, so the page and the menu counter stay fresh.
 */
export function usePendingTasks() {
  const { selectedOrg } = useOrg();
  const orgId = selectedOrg?.id ?? "";

  return useQuery({
    queryKey: [...tasksListQueryKey(orgId), "pending"],
    queryFn: () => fetchPendingTasks(orgId),
    enabled: Boolean(orgId),
  });
}
