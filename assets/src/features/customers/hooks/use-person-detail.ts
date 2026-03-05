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

  // Single query for patient identity and all directly associated records.
  const patientDetail = useQuery({
    queryKey: ["person", personId, "patient-detail", organizationId],
    queryFn: () => fetchPatientDetail(personId, organizationId),
    enabled,
  });

  // Derived from the consolidated patient detail query.
  const patientId = patientDetail.data?.id ?? null;
  const hasPatient = patientDetail.data != null;
  const person = patientDetail.data?.person ?? null;

  // Health-data queries only fire once a patient record is confirmed to exist.
  const healthEnabled = enabled && hasPatient;

  // Per-person query (does not require a patient record).
  const subscriptions = useQuery({
    queryKey: ["person", personId, "subscriptions", organizationId],
    queryFn: () => fetchSubscriptionsByPerson(personId, organizationId),
    enabled,
  });

  const anthropometry = useQuery({
    queryKey: ["person", personId, "anthropometry", organizationId],
    queryFn: () => fetchAnthropometry(personId, organizationId),
    enabled: healthEnabled,
  });
  const observations = useQuery({
    queryKey: ["person", personId, "observations", organizationId],
    queryFn: () => fetchObservationsSummary(personId, organizationId),
    enabled: healthEnabled,
  });
  const foodPreferences = useQuery({
    queryKey: ["person", personId, "foodPreferences", organizationId],
    queryFn: () => fetchFoodPreferences(personId, organizationId),
    enabled: healthEnabled,
  });

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
    hasPatient,
    person,
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
