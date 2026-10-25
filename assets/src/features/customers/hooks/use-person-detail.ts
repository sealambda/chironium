import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { selectAnthropometryHistory } from "@/features/customers/api/anthropometry-api.selectors";
import {
  type FoodPreferencesData,
  selectFoodPreferenceLabels,
  selectFoodPreferencesHistory,
} from "@/features/customers/api/food-preferences-api";
import { nutritionPlanRecordedAt } from "@/features/customers/api/nutrition-plans-api";
import {
  type ObservationsPage,
  selectLatestMenstrualCycle,
  selectMenstrualCycleHistory,
  selectObservationsList,
} from "@/features/customers/api/observations-api";
import { fetchPatientDetail } from "@/features/customers/api/patients-api";
import { fetchSubscriptionsByPerson } from "@/features/customers/api/subscriptions-api";
import { useOrg } from "@/shared/session/use-org";
import { personQueryKeys } from "@/shared/utils/query-keys";

/** Combine loading states from multiple queries. */
function combineLoadingState(...queries: UseQueryResult<unknown, Error>[]) {
  return queries.some((q) => q.isLoading);
}

const EMPTY_FOOD_PREFERENCE_LABELS: FoodPreferencesData = {
  included: [],
  excluded: [],
};
const EMPTY_OBSERVATIONS_PAGE: ObservationsPage = {
  items: [],
  count: 0,
  endKeyset: null,
};

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

  // Per-person query (does not require a patient record).
  const subscriptions = useQuery({
    queryKey: personQueryKeys.subscriptions(personId, organizationId),
    queryFn: () => fetchSubscriptionsByPerson(personId, organizationId),
    enabled,
  });

  const patientObservations = patientDetail.data?.observations ?? [];

  const anthropometryHistoryData = useMemo(
    () => selectAnthropometryHistory(patientObservations, selectedOrg?.timezone),
    [patientObservations, selectedOrg?.timezone],
  );
  const menstrualCycleData = useMemo(
    () => selectLatestMenstrualCycle(patientObservations),
    [patientObservations],
  );
  const menstrualCycleHistoryData = useMemo(
    () => selectMenstrualCycleHistory(patientObservations),
    [patientObservations],
  );
  const foodPreferencesHistoryData = useMemo(
    () => selectFoodPreferencesHistory(patientObservations),
    [patientObservations],
  );
  const observationsListData = useMemo(
    () => selectObservationsList(patientObservations),
    [patientObservations],
  );

  const anthropometryHistory = {
    data: anthropometryHistoryData,
    isLoading: patientDetail.isLoading,
  };
  const menstrualCycle = {
    data: menstrualCycleData,
    isLoading: patientDetail.isLoading,
  };
  const menstrualCycleHistory = {
    data: menstrualCycleHistoryData,
    isLoading: patientDetail.isLoading,
  };
  const foodPreferencesHistory = {
    data: foodPreferencesHistoryData,
    isLoading: patientDetail.isLoading,
  };
  const observationsList = {
    data: observationsListData,
    isLoading: patientDetail.isLoading,
  };

  const foodPreferenceLabels = useMemo<FoodPreferencesData>(
    () =>
      foodPreferencesHistoryData
        ? selectFoodPreferenceLabels(foodPreferencesHistoryData)
        : EMPTY_FOOD_PREFERENCE_LABELS,
    [foodPreferencesHistoryData],
  );

  const activeGoals = useMemo(
    () => (patientDetail.data?.goals ?? []).filter((goal) => goal.lifecycleStatus === "ACTIVE"),
    [patientDetail.data?.goals],
  );

  const goals = {
    data: activeGoals,
    isLoading: patientDetail.isLoading,
  };
  const nutritionPlansData = useMemo(
    () =>
      [...(patientDetail.data?.nutritionPlans ?? [])].sort((a, b) =>
        nutritionPlanRecordedAt(b).localeCompare(nutritionPlanRecordedAt(a)),
      ),
    [patientDetail.data?.nutritionPlans],
  );
  const nutritionPlans = {
    data: nutritionPlansData,
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
  const medicationRequests = {
    data: patientDetail.data?.medicationRequests ?? [],
    isLoading: patientDetail.isLoading,
  };

  const currentSubscription = subscriptions.data?.[0];
  const activeNutritionPlan = nutritionPlansData[0];

  const isLoading = combineLoadingState(patientDetail, subscriptions);

  return {
    patientId,
    hasPatient,
    person,
    subscriptions,
    anthropometryHistory,
    nutritionPlans,
    goals,
    menstrualCycle,
    menstrualCycleHistory,
    observationsList: hasPatient
      ? observationsList
      : { ...observationsList, data: EMPTY_OBSERVATIONS_PAGE },
    foodPreferencesHistory,
    foodPreferenceLabels,
    allergyIntolerances,
    conditions,
    medications,
    medicationRequests,
    currentSubscription,
    activeNutritionPlan,
    isLoading,
  };
}
