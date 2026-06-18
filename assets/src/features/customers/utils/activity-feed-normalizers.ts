import { isFuture, isToday, parseISO } from "date-fns";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { ConditionItem } from "@/features/customers/api/condition-api";
import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import type { MedicationItem } from "@/features/customers/api/medications-api";
import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import type {
  MenstrualCycleEntry,
  ObservationsPage,
} from "@/features/customers/api/observations-api";
import type {
  FeedDateGroup,
  FeedEvent,
  FeedEventKind,
} from "@/features/customers/types/activity-feed";
import {
  normalizeAllergyIntolerances,
  normalizeAnthropometry,
  normalizeConditions,
  normalizeFoodPreferences,
  normalizeGoals,
  normalizeMedications,
  normalizeMenstrualCycles,
  normalizeNutritionPlans,
  normalizeObservations,
  normalizeTasks,
} from "@/features/customers/utils/activity-feed-clinical-normalizers";
import {
  formatDayLabelFromIso,
  toIsoDateString,
} from "@/features/customers/utils/activity-feed-dates";
import { normalizeSubscriptions } from "@/features/customers/utils/activity-feed-subscription-normalizers";
import type { PatientTask } from "@/features/tasks/api/tasks-api";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";

interface BuildActivityFeedEventsInput {
  observations: ObservationsPage | undefined;
  tasks: PatientTask[] | undefined;
  goals: GoalRecord[];
  subscriptions: SubscriptionRecord[];
  anthropometry: AnthropometricSnapshot[] | undefined;
  conditions: ConditionItem[];
  allergyIntolerances: AllergyIntoleranceItem[];
  medications: MedicationItem[];
  foodPreferences: FoodPreferenceHistoryItem[] | undefined;
  menstrualCycles: MenstrualCycleEntry[] | undefined;
  nutritionPlans: NutritionPlanRecord[] | undefined;
  activeFilter: FeedEventKind | "all";
  personName?: string | null;
}

export function buildActivityFeedEvents({
  observations,
  tasks,
  goals,
  subscriptions,
  anthropometry,
  conditions,
  allergyIntolerances,
  medications,
  foodPreferences,
  menstrualCycles,
  nutritionPlans,
  activeFilter,
  personName,
}: BuildActivityFeedEventsInput): FeedEvent[] {
  const events = [
    ...normalizeObservations(observations),
    ...normalizeTasks(tasks),
    ...normalizeGoals(goals),
    ...normalizeSubscriptions(subscriptions, personName),
    ...normalizeAnthropometry(anthropometry),
    ...normalizeConditions(conditions),
    ...normalizeAllergyIntolerances(allergyIntolerances),
    ...normalizeMedications(medications),
    ...normalizeFoodPreferences(foodPreferences),
    ...normalizeMenstrualCycles(menstrualCycles),
    ...normalizeNutritionPlans(nutritionPlans),
  ];
  const filtered =
    activeFilter === "all" ? events : events.filter((event) => event.kind === activeFilter);

  return filtered.sort((left, right) => right.date.localeCompare(left.date));
}

export function groupFeedEventsByDate(events: FeedEvent[]): FeedDateGroup[] {
  const map = new Map<string, FeedDateGroup>();

  for (const event of events) {
    const isoDate = toIsoDateString(event.date);
    const today = isToday(parseISO(isoDate));
    const group = map.get(isoDate);

    if (group) {
      group.events.push(event);
      continue;
    }

    map.set(isoDate, {
      isoDate,
      label: formatDayLabelFromIso(isoDate),
      events: [event],
      isToday: today,
      isFuture: !today && isFuture(parseISO(isoDate)),
    });
  }

  return Array.from(map.values()).sort((left, right) => right.isoDate.localeCompare(left.isoDate));
}
