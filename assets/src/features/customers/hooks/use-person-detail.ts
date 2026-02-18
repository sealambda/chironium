import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import { fetchSubscriptionsByPerson } from "@/features/customers/api/subscriptions-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { fetchBodyMetrics, fetchNutritionPlans } from "@/mocks/api/customer-detail-api";

/** Combine loading states from multiple queries. */
function combineLoadingState(...queries: UseQueryResult<unknown, Error>[]) {
  return queries.some((q) => q.isLoading);
}

/**
 * Hook to fetch and manage all person detail data.
 * Orchestrates multiple queries and provides derived state for the detail page.
 */
export function usePersonDetail(personId: string) {
  const { selectedOrg } = useOrg();
  const organizationId = selectedOrg?.id ?? "";
  const enabled = Boolean(personId && organizationId);

  // Query config factory for consistent structure
  const queryConfig = <T>(key: string, fetchFn: (id: string, orgId: string) => Promise<T>) => ({
    queryKey: ["person", personId, key, organizationId],
    queryFn: () => fetchFn(personId, organizationId),
    enabled,
  });

  const subscriptions = useQuery(queryConfig("subscriptions", fetchSubscriptionsByPerson));
  const bodyMetrics = useQuery(queryConfig("bodyMetrics", fetchBodyMetrics));
  const nutritionPlans = useQuery(queryConfig("nutritionPlans", fetchNutritionPlans));

  // Derived state for cards
  const currentSubscription = subscriptions.data?.[0];

  const activeNutritionPlan = nutritionPlans.data?.find(
    (plan) => !plan.endDate || new Date(plan.endDate) > new Date(),
  );

  const isLoading = combineLoadingState(subscriptions, bodyMetrics, nutritionPlans);

  return {
    subscriptions,
    bodyMetrics,
    nutritionPlans,
    currentSubscription,
    activeNutritionPlan,
    isLoading,
  };
}
