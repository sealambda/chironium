import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useOrg } from "@/features/org/hooks/use-org";
import {
  fetchBodyMetrics,
  fetchCycleHistory,
  fetchNutritionPlans,
  fetchPathologies,
  fetchSubscriptionHistory,
} from "@/mocks/api/customer-detail-api";

/** Combine loading and error states from multiple queries. */
function combineQueryStates(...queries: UseQueryResult<unknown, Error>[]) {
  return {
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error ?? null,
  };
}

/**
 * Hook to fetch and manage all customer detail data.
 * Orchestrates multiple queries and provides derived state for the detail page.
 */
export function useCustomerDetail(customerId: string) {
  const { selectedOrg } = useOrg();
  const organizationId = selectedOrg?.id ?? "";
  const enabled = Boolean(customerId && organizationId);

  // Query config factory for consistent structure
  const queryConfig = <T>(
    key: string,
    fetchFn: (cId: string, orgId: string) => Promise<T>,
  ) => ({
    queryKey: ["customer", customerId, key, organizationId],
    queryFn: () => fetchFn(customerId, organizationId),
    enabled,
  });

  const subscriptions = useQuery(
    queryConfig("subscriptionHistory", fetchSubscriptionHistory),
  );
  const bodyMetrics = useQuery(queryConfig("bodyMetrics", fetchBodyMetrics));
  const nutritionPlans = useQuery(
    queryConfig("nutritionPlans", fetchNutritionPlans),
  );
  const cycleHistory = useQuery(queryConfig("cycleHistory", fetchCycleHistory));
  const pathologies = useQuery(queryConfig("pathologies", fetchPathologies));

  // Derived state for cards
  // Most recent subscription (data is returned in order from mock handlers)
  const currentSubscription = subscriptions.data?.[0];

  // Latest body metrics record
  const latestBodyMetrics = bodyMetrics.data?.[0];

  // Active nutrition plan (no end date = open-ended, or end date in future)
  const activeNutritionPlan = nutritionPlans.data?.find(
    (plan) => !plan.endDate || new Date(plan.endDate) > new Date(),
  );

  // Last cycle record
  const lastCycle = cycleHistory.data?.[0];

  // Active pathologies (status = 'active')
  const activePathologies =
    pathologies.data?.filter((p) => p.status === "active") ?? [];

  // Check if user has cycle tracking enabled (has any cycle records)
  const hasCycleTracking = (cycleHistory.data?.length ?? 0) > 0;

  // Combined loading and error state
  const { isLoading, error } = combineQueryStates(
    subscriptions,
    bodyMetrics,
    nutritionPlans,
    cycleHistory,
    pathologies,
  );

  return {
    // Raw query results for drawers
    subscriptions,
    bodyMetrics,
    nutritionPlans,
    cycleHistory,
    pathologies,
    // Derived state for cards
    currentSubscription,
    latestBodyMetrics,
    activeNutritionPlan,
    lastCycle,
    activePathologies,
    hasCycleTracking,
    // Combined states
    isLoading,
    error,
  };
}
