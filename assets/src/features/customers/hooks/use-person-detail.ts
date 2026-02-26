import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import { fetchAllergyIntolerances } from "@/features/customers/api/allergy-intolerance-api";
import { fetchAnthropometry } from "@/features/customers/api/anthropometry-api";
import { fetchGoals } from "@/features/customers/api/goals-api";
import { fetchNutritionPlans } from "@/features/customers/api/nutrition-plans-api";
import {
  fetchFoodPreferences,
  fetchObservationsSummary,
} from "@/features/customers/api/observations-api";
import { fetchPatientByPerson } from "@/features/customers/api/patients-api";
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

  const patient = useQuery(queryConfig("patient", fetchPatientByPerson));
  const subscriptions = useQuery(queryConfig("subscriptions", fetchSubscriptionsByPerson));
  const anthropometry = useQuery(queryConfig("anthropometry", fetchAnthropometry));
  const nutritionPlans = useQuery(queryConfig("nutritionPlans", fetchNutritionPlans));
  const goals = useQuery(queryConfig("goals", fetchGoals));
  const observations = useQuery(queryConfig("observations", fetchObservationsSummary));
  const foodPreferences = useQuery(queryConfig("foodPreferences", fetchFoodPreferences));

  // Derived state for cards
  const patientId = patient.data ?? null;

  const allergyIntolerances = useQuery({
    queryKey: ["person", personId, "allergyIntolerances", organizationId],
    queryFn: () =>
      patientId ? fetchAllergyIntolerances(patientId, organizationId) : Promise.resolve([]),
    enabled: enabled && Boolean(patientId),
  });
  const currentSubscription = subscriptions.data?.[0];

  const activeNutritionPlan = nutritionPlans.data?.[0];

  const isLoading = combineLoadingState(
    patient,
    subscriptions,
    anthropometry,
    nutritionPlans,
    goals,
    observations,
  );

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
