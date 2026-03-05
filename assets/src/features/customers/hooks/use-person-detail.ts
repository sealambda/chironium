import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import { fetchAnthropometry } from "@/features/customers/api/anthropometry-api";
import { fetchFoodPreferences } from "@/features/customers/api/food-preferences-api";
import { fetchObservationsSummary } from "@/features/customers/api/observations-api";
import { fetchPatientDetail } from "@/features/customers/api/patients-api";
import { fetchSubscriptionsByPerson } from "@/features/customers/api/subscriptions-api";
import { useOrg } from "@/features/org/hooks/use-org";

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

  // Single query for patient identity and all directly associated records.
  const patientDetail = useQuery({
    queryKey: ["person", personId, "patient-detail", organizationId],
    queryFn: () => fetchPatientDetail(personId, organizationId),
    enabled,
  });
  const subscriptions = useQuery(queryConfig("subscriptions", fetchSubscriptionsByPerson));
  const anthropometry = useQuery(queryConfig("anthropometry", fetchAnthropometry));
  const observations = useQuery(queryConfig("observations", fetchObservationsSummary));
  const foodPreferences = useQuery(queryConfig("foodPreferences", fetchFoodPreferences));

  // Derived from the consolidated patient detail query.
  const patientId = patientDetail.data?.id ?? null;
  const goals = {
    data: patientDetail.data?.goals ?? [],
    isLoading: patientDetail.isLoading,
  };
  const nutritionPlans = {
    data: patientDetail.data?.nutritionPlans ?? [],
    isLoading: patientDetail.isLoading,
  };
  const allergyIntolerances = {
    data: patientDetail.data?.allergyIntolerances ?? [],
    isLoading: patientDetail.isLoading,
  };

  const currentSubscription = subscriptions.data?.[0];
  const activeNutritionPlan = patientDetail.data?.nutritionPlans?.[0];

  const isLoading = combineLoadingState(patientDetail, subscriptions, anthropometry, observations);

  return {
    patientId,
    subscriptions,
    anthropometry,
    nutritionPlans,
    goals,
    observations,
    foodPreferences,
    allergyIntolerances,
    currentSubscription,
    activeNutritionPlan,
    isLoading,
  };
}
