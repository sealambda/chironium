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
import type { FeedActor, FeedEvent } from "@/features/customers/types/activity-feed";
import {
  actorFromNotes,
  actorFromVersions,
  mergeFeedActor,
  uniqueActors,
} from "@/features/customers/types/activity-feed";
import {
  bucketByMinute,
  nowIso,
} from "@/features/customers/utils/activity-feed-normalizers-shared";
import type { PatientTask } from "@/features/tasks/api/tasks-api";

export function normalizeObservations(page: ObservationsPage | undefined): FeedEvent[] {
  return (page?.items ?? []).map((observation) => ({
    kind: "observation",
    id: observation.id,
    date: observation.effectiveDateTime ?? nowIso(),
    actors: uniqueActors([
      mergeFeedActor(
        actorFromVersions(observation.paperTrailVersions),
        actorFromNotes(observation.note),
      ),
    ]),
    payload: observation,
  }));
}

export function normalizeTasks(tasks: PatientTask[] | undefined): FeedEvent[] {
  return (tasks ?? []).map((task) => ({
    kind: "task",
    id: task.id,
    date: task.requestedPeriod?.start ?? nowIso(),
    actors: uniqueActors([
      mergeFeedActor(actorFromVersions(task.paperTrailVersions), actorFromNotes(task.note)),
    ]),
    payload: task,
  }));
}

export function normalizeMenstrualCycles(entries: MenstrualCycleEntry[] | undefined): FeedEvent[] {
  return (entries ?? []).map((entry) => ({
    kind: "menstrual",
    id: entry.id,
    date: entry.effectiveDateTime,
    actors: uniqueActors([
      mergeFeedActor(
        actorFromVersions(entry.paperTrailVersions),
        actorFromNotes(entry.sourceNotes),
      ),
    ]),
    payload: entry,
  }));
}

export function normalizeGoals(goals: GoalRecord[]): FeedEvent[] {
  // Bucket "created" events by minute-precision timestamp so goals set simultaneously appear as one feed event.
  const createdBuckets = new Map<string, { goals: GoalRecord[]; actors: FeedActor[] }>();

  for (const goal of goals) {
    const actor = mergeFeedActor(
      actorFromVersions(goal.paperTrailVersions),
      actorFromNotes(goal.note),
    );
    const rawDate =
      goal.note?.[0]?.time ??
      (goal.startDate ? `${goal.startDate}T00:00:00.000Z` : null) ??
      nowIso();
    // Truncate to minute precision for bucketing.
    const bucketKey = rawDate.slice(0, 16);

    const bucket = createdBuckets.get(bucketKey);
    if (bucket) {
      bucket.goals.push(goal);
      if (actor) {
        bucket.actors.push(actor);
      }
    } else {
      createdBuckets.set(bucketKey, {
        goals: [goal],
        actors: actor ? [actor] : [],
      });
    }
  }

  const createdEvents: FeedEvent[] = Array.from(createdBuckets.entries()).map(
    ([bucketKey, { goals: bucketGoals, actors: bucketActors }]) => ({
      kind: "goal",
      id: `goal-created-${bucketKey}`,
      date: `${bucketKey}:00.000Z`,
      actors: uniqueActors(bucketActors).length > 0 ? uniqueActors(bucketActors) : undefined,
      payload: bucketGoals,
    }),
  );

  return createdEvents;
}

function anthropometryObservationActors(snapshot: AnthropometricSnapshot): FeedActor[] {
  if (!snapshot.observations) {
    return [];
  }

  const actors: FeedActor[] = [];
  for (const observation of Object.values(snapshot.observations)) {
    const fromVersions = actorFromVersions(observation?.paperTrailVersions);
    if (fromVersions) {
      actors.push(fromVersions);
    }

    for (const note of observation?.note ?? []) {
      const actor = actorFromNotes([note]);
      if (actor) {
        actors.push(actor);
      }
    }
  }

  return actors;
}

export function normalizeAnthropometry(
  snapshots: AnthropometricSnapshot[] | undefined,
): FeedEvent[] {
  return (snapshots ?? []).map((snapshot) => {
    const primaryActor = mergeFeedActor(
      actorFromVersions(snapshot.paperTrailVersions),
      actorFromNotes(snapshot.notes),
    );
    const allActors = uniqueActors([primaryActor, ...anthropometryObservationActors(snapshot)]);

    return {
      kind: "anthropometry",
      id: snapshot.primaryObservationId ?? snapshot.date,
      date: snapshot.date,
      actors: allActors.length > 0 ? allActors : undefined,
      payload: snapshot,
    };
  });
}

export function normalizeConditions(conditions: ConditionItem[]): FeedEvent[] {
  // The activity feed timestamps when the record was created, not when the
  // condition started. Onset can be years in the past (e.g. a chronic
  // diagnosis) and is surfaced inside the event body instead.
  return bucketByMinute(
    conditions,
    (condition) =>
      condition.recordedDate ??
      condition.paperTrailVersions?.[0]?.versionInsertedAt ??
      condition.onsetDateTime ??
      nowIso(),
  ).map((group) => ({
    kind: "condition",
    id: group.items.map((item) => item.id).join("-"),
    date: group.date,
    actors: group.actors.length > 0 ? group.actors : undefined,
    payload: group.items,
  }));
}

export function normalizeNutritionPlans(plans: NutritionPlanRecord[] | undefined): FeedEvent[] {
  return bucketByMinute(
    plans ?? [],
    (plan) => plan.paperTrailVersions?.[0]?.versionInsertedAt ?? nowIso(),
  ).map((group) => ({
    kind: "nutrition",
    id: group.items.map((item) => item.id).join("-"),
    date: group.date,
    actors: group.actors.length > 0 ? group.actors : undefined,
    payload: group.items,
  }));
}

export function normalizeAllergyIntolerances(items: AllergyIntoleranceItem[]): FeedEvent[] {
  // Split allergies and intolerances into separate feed events so they render
  // with distinct labels and accent colors.
  const allergies: AllergyIntoleranceItem[] = [];
  const intolerances: AllergyIntoleranceItem[] = [];
  for (const item of items) {
    if (item.type?.toUpperCase() === "INTOLERANCE") {
      intolerances.push(item);
    } else {
      allergies.push(item);
    }
  }

  const buildEvents = (
    bucketItems: AllergyIntoleranceItem[],
    aiType: "ALLERGY" | "INTOLERANCE",
  ): FeedEvent[] =>
    bucketByMinute(
      bucketItems,
      (item) =>
        item.onsetDateTime ??
        item.recordedDate ??
        item.paperTrailVersions?.[0]?.versionInsertedAt ??
        nowIso(),
    ).map((group) => ({
      kind: "allergy",
      id: group.items.map((item) => item.id).join("-"),
      date: group.date,
      actors: group.actors.length > 0 ? group.actors : undefined,
      aiType,
      payload: group.items,
    }));

  return [...buildEvents(allergies, "ALLERGY"), ...buildEvents(intolerances, "INTOLERANCE")];
}

export function normalizeMedications(items: MedicationItem[]): FeedEvent[] {
  return bucketByMinute(
    items,
    (item) =>
      item.effectiveDateTime ??
      item.dateAsserted ??
      item.paperTrailVersions?.[0]?.versionInsertedAt ??
      nowIso(),
  ).map((group) => ({
    kind: "medication",
    id: group.items.map((item) => item.id).join("-"),
    date: group.date,
    actors: group.actors.length > 0 ? group.actors : undefined,
    payload: group.items,
  }));
}

export function normalizeFoodPreferences(
  items: FoodPreferenceHistoryItem[] | undefined,
): FeedEvent[] {
  const buckets = new Map<
    string,
    {
      date: string;
      actors: FeedActor[];
      variant: "inclusion" | "exclusion";
      items: FoodPreferenceHistoryItem[];
    }
  >();

  for (const item of items ?? []) {
    const date = item.date ?? nowIso();
    const key = `${date.slice(0, 16)}-${item.type}`;
    const itemActor = mergeFeedActor(
      actorFromVersions(item.paperTrailVersions),
      actorFromNotes(item.notes),
    );
    const existingBucket = buckets.get(key);

    if (existingBucket) {
      existingBucket.items.push(item);
      if (itemActor) {
        existingBucket.actors.push(itemActor);
      }
      continue;
    }

    buckets.set(key, {
      date,
      actors: itemActor ? [itemActor] : [],
      variant: item.type,
      items: [item],
    });
  }

  return Array.from(buckets.values()).map((group) => ({
    kind: "food-preference",
    id: group.items.map((item) => item.id).join("-"),
    date: group.date,
    actors: uniqueActors(group.actors).length > 0 ? uniqueActors(group.actors) : undefined,
    variant: group.variant,
    payload: group.items,
  }));
}
