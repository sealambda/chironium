import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { fetchAnthropometryHistory } from "@/features/customers/api/anthropometry-api";
import {
  type FoodPreferencesData,
  fetchFoodPreferencesHistory,
  selectFoodPreferenceLabels,
} from "@/features/customers/api/food-preferences-api";
import { fetchLatestMenstrualCycle } from "@/features/customers/api/observations-api";
import { fetchPatientDetail } from "@/features/customers/api/patients-api";
import { fetchSubscriptionsByPerson } from "@/features/customers/api/subscriptions-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { personQueryKeys } from "@/shared/utils/query-keys";

/** Combine loading states from multiple queries. */
function combineLoadingState(...queries: UseQueryResult<unknown, Error>[]) {
  return queries.some((q) => q.isLoading);
}

const EMPTY_FOOD_PREFERENCE_LABELS: FoodPreferencesData = { included: [], excluded: [] };

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
    queryKey: personQueryKeys.patientDetail(personId, organizationId),
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
    queryKey: personQueryKeys.subscriptions(personId, organizationId),
    queryFn: () => fetchSubscriptionsByPerson(personId, organizationId),
    enabled,
  });

  // Full anthropometric history. Consumers that only need the latest entries
  // read `data?.[0]` (most recent) and `data?.[1]` (previous).
  const anthropometryHistory = useQuery({
    queryKey: personQueryKeys.anthropometryHistory(personId, organizationId),
    queryFn: () => fetchAnthropometryHistory(personId, organizationId),
    enabled: healthEnabled,
  });
  const menstrualCycle = useQuery({
    queryKey: personQueryKeys.menstrualCycle(personId, organizationId),
    queryFn: () => fetchLatestMenstrualCycle(personId, organizationId),
    enabled: healthEnabled,
  });
  // Full food preference and aversion history. Aggregated chip labels are derived below.
  const foodPreferencesHistory = useQuery({
    queryKey: personQueryKeys.foodPreferencesHistory(personId, organizationId),
    queryFn: () => fetchFoodPreferencesHistory(personId, organizationId),
    enabled: healthEnabled,
  });

  const foodPreferenceLabels = useMemo<FoodPreferencesData>(
    () =>
      foodPreferencesHistory.data
        ? selectFoodPreferenceLabels(foodPreferencesHistory.data)
        : EMPTY_FOOD_PREFERENCE_LABELS,
    [foodPreferencesHistory.data],
  );

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
  const conditions = {
    data: patientDetail.data?.conditions ?? [],
    isLoading: patientDetail.isLoading,
  };
  const medications = {
    data: patientDetail.data?.medicationStatements ?? [],
    isLoading: patientDetail.isLoading,
  };

  const currentSubscription = subscriptions.data?.[0];
  const activeNutritionPlan = patientDetail.data?.nutritionPlans?.[0];

  const isLoading = combineLoadingState(
    patientDetail,
    subscriptions,
    anthropometryHistory,
    menstrualCycle,
  );

  return {
    patientId,
    hasPatient,
    person,
    subscriptions,
    anthropometryHistory,
    nutritionPlans,
    goals,
    menstrualCycle,
    foodPreferencesHistory,
    foodPreferenceLabels,
    allergyIntolerances,
    conditions,
    medications,
    currentSubscription,
    activeNutritionPlan,
    isLoading,
  };
}
