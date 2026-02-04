import { useQuery } from "@tanstack/react-query";
import { useOrg } from "@/features/org/hooks/use-org";
import {
  fetchBodyMetrics,
  fetchCycleHistory,
  fetchNutritionPlans,
  fetchPathologies,
  fetchSubscriptionHistory,
} from "../api/customer-detail-api";

/**
 * Hook to fetch and manage all customer detail data.
 * Orchestrates multiple queries and provides derived state for the detail page.
 */
export function useCustomerDetail(customerId: string) {
  const { selectedOrg } = useOrg();
  const organizationId = selectedOrg?.id ?? "";

  // Subscription history query
  const subscriptions = useQuery({
    queryKey: ["customer", customerId, "subscriptionHistory", organizationId],
    queryFn: () => fetchSubscriptionHistory(customerId, organizationId),
    enabled: Boolean(customerId && organizationId),
  });

  // Body metrics query
  const bodyMetrics = useQuery({
    queryKey: ["customer", customerId, "bodyMetrics", organizationId],
    queryFn: () => fetchBodyMetrics(customerId, organizationId),
    enabled: Boolean(customerId && organizationId),
  });

  // Nutrition plans query
  const nutritionPlans = useQuery({
    queryKey: ["customer", customerId, "nutritionPlans", organizationId],
    queryFn: () => fetchNutritionPlans(customerId, organizationId),
    enabled: Boolean(customerId && organizationId),
  });

  // Cycle history query
  const cycleHistory = useQuery({
    queryKey: ["customer", customerId, "cycleHistory", organizationId],
    queryFn: () => fetchCycleHistory(customerId, organizationId),
    enabled: Boolean(customerId && organizationId),
  });

  // Pathologies query
  const pathologies = useQuery({
    queryKey: ["customer", customerId, "pathologies", organizationId],
    queryFn: () => fetchPathologies(customerId, organizationId),
    enabled: Boolean(customerId && organizationId),
  });

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

  // Combined loading state
  const isLoading =
    subscriptions.isLoading ||
    bodyMetrics.isLoading ||
    nutritionPlans.isLoading ||
    cycleHistory.isLoading ||
    pathologies.isLoading;

  // Combined error state
  const error =
    subscriptions.error ||
    bodyMetrics.error ||
    nutritionPlans.error ||
    cycleHistory.error ||
    pathologies.error;

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
