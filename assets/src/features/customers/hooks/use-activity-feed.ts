import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { ConditionItem } from "@/features/customers/api/condition-api";
import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import type { MedicationItem } from "@/features/customers/api/medications-api";
import {
  fetchMenstrualCycleHistory,
  fetchObservationsList,
} from "@/features/customers/api/observations-api";
import type { FeedDateGroup, FeedEventKind } from "@/features/customers/types/activity-feed";
import {
  buildActivityFeedEvents,
  groupFeedEventsByDate,
} from "@/features/customers/utils/activity-feed-normalizers";
import { fetchTasksForPatient } from "@/features/tasks/api/tasks-api";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";
import { personQueryKeys } from "@/shared/utils/query-keys";

const INITIAL_COUNT = 15;

interface UseActivityFeedParams {
  personId: string;
  patientId: string | null;
  organizationId: string;
  goals: GoalRecord[];
  subscriptions: SubscriptionRecord[];
  conditions: ConditionItem[];
  allergyIntolerances: AllergyIntoleranceItem[];
  medications: MedicationItem[];
  anthropometry: AnthropometricSnapshot[];
  foodPreferences: FoodPreferenceHistoryItem[];
  activeFilter: FeedEventKind | "all";
  personName?: string | null;
  enabled?: boolean;
}

interface UseActivityFeedResult {
  groups: FeedDateGroup[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  showMore: () => void;
}

export function useActivityFeed({
  personId,
  patientId,
  organizationId,
  goals,
  subscriptions,
  conditions,
  allergyIntolerances,
  medications,
  anthropometry,
  foodPreferences,
  activeFilter,
  personName,
  enabled = true,
}: UseActivityFeedParams): UseActivityFeedResult {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const showMore = useCallback(() => setVisibleCount((count) => count + INITIAL_COUNT), []);

  const fetchEnabled = enabled && Boolean(personId && organizationId && patientId);

  const observationsQuery = useQuery({
    queryKey: personQueryKeys.observationsList(personId, organizationId),
    queryFn: () => fetchObservationsList(personId, organizationId),
    enabled: fetchEnabled,
  });

  const tasksQuery = useQuery({
    queryKey: personQueryKeys.patientTasks(personId, organizationId, patientId ?? ""),
    queryFn: () => fetchTasksForPatient(patientId ?? "", organizationId),
    enabled: fetchEnabled,
  });

  const menstrualQuery = useQuery({
    queryKey: personQueryKeys.menstrualCycleHistory(personId, organizationId),
    queryFn: () => fetchMenstrualCycleHistory(personId, organizationId),
    enabled: fetchEnabled,
  });

  const allEvents = useMemo(
    () =>
      buildActivityFeedEvents({
        observations: observationsQuery.data,
        tasks: tasksQuery.data,
        goals,
        subscriptions,
        anthropometry,
        conditions,
        allergyIntolerances,
        medications,
        foodPreferences,
        menstrualCycles: menstrualQuery.data,
        activeFilter,
        personName,
      }),
    [
      observationsQuery.data,
      tasksQuery.data,
      goals,
      subscriptions,
      anthropometry,
      conditions,
      allergyIntolerances,
      medications,
      foodPreferences,
      menstrualQuery.data,
      activeFilter,
      personName,
    ],
  );

  const allGroups = useMemo(() => groupFeedEventsByDate(allEvents), [allEvents]);

  const visibleGroups = useMemo<FeedDateGroup[]>(() => {
    let remaining = visibleCount;
    const result: FeedDateGroup[] = [];

    for (const group of allGroups) {
      if (remaining <= 0) {
        break;
      }
      const slicedEvents = group.events.slice(0, remaining);
      remaining -= slicedEvents.length;
      result.push({ ...group, events: slicedEvents });
    }

    return result;
  }, [allGroups, visibleCount]);

  const totalEvents = allEvents.length;
  const shownEvents = visibleGroups.reduce((sum, g) => sum + g.events.length, 0);

  return {
    groups: visibleGroups,
    isLoading: observationsQuery.isLoading || tasksQuery.isLoading || menstrualQuery.isLoading,
    isError: observationsQuery.isError || tasksQuery.isError || menstrualQuery.isError,
    hasMore: shownEvents < totalEvents,
    showMore,
  };
}
