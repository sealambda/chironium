import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { ConditionItem } from "@/features/customers/api/condition-api";
import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import type { MedicationRequestItem } from "@/features/customers/api/medication-requests-api";
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
  patientActor,
  uniqueActors,
} from "@/features/customers/types/activity-feed";
import {
  bucketByMinute,
  nowIso,
  type PatientName,
} from "@/features/customers/utils/activity-feed-normalizers-shared";
import type { QuestionnaireResponseRecord } from "@/features/questionnaires/api/questionnaire-responses-api";
import { questionnaireRequestStatus } from "@/features/questionnaires/model/questionnaire-request-status";
import { isQuestionnaireRequestTask, type PatientTask } from "@/features/tasks/api/tasks-api";

export function normalizeObservations(
  page: ObservationsPage | undefined,
  patientName: PatientName,
): FeedEvent[] {
  return (page?.items ?? []).map((observation) => ({
    kind: "observation",
    id: observation.id,
    date: observation.effectiveDateTime ?? nowIso(),
    actors: uniqueActors([
      mergeFeedActor(
        actorFromVersions(observation.paperTrailVersions, patientName),
        actorFromNotes(observation.note),
      ),
    ]),
    payload: observation,
  }));
}

/**
 * The staff member who sent a request. Versions are unordered, so a version the patient
 * made (opening or submitting) is skipped rather than shown as the sender.
 */
function requestSender(task: PatientTask): FeedActor | undefined {
  const staffVersions = (task.paperTrailVersions ?? []).filter(
    (version) => !version.changedByPatient,
  );
  const fromVersions = actorFromVersions(staffVersions);
  if (fromVersions) {
    return fromVersions;
  }
  const requesterName = task.requesterName?.trim();
  return requesterName ? { name: requesterName } : undefined;
}

export function normalizeTasks(
  tasks: PatientTask[] | undefined,
  patientName: PatientName,
  now: Date,
): FeedEvent[] {
  return (tasks ?? []).map((task): FeedEvent => {
    if (isQuestionnaireRequestTask(task)) {
      return {
        kind: "questionnaire-request",
        id: task.id,
        // The period starts when the request is sent.
        date:
          task.requestedPeriod?.start ??
          task.paperTrailVersions?.[0]?.versionInsertedAt ??
          nowIso(),
        actors: uniqueActors([requestSender(task)]),
        status: questionnaireRequestStatus(task, now),
        payload: task,
      };
    }

    return {
      kind: "task",
      id: task.id,
      date: task.requestedPeriod?.start ?? nowIso(),
      actors: uniqueActors([
        mergeFeedActor(
          actorFromVersions(task.paperTrailVersions, patientName),
          actorFromNotes(task.note),
        ),
      ]),
      payload: task,
    };
  });
}

export function normalizeMenstrualCycles(
  entries: MenstrualCycleEntry[] | undefined,
  patientName: PatientName,
): FeedEvent[] {
  return (entries ?? []).map((entry) => ({
    kind: "menstrual",
    id: entry.id,
    date: entry.effectiveDateTime,
    actors: uniqueActors([
      mergeFeedActor(
        actorFromVersions(entry.paperTrailVersions, patientName),
        actorFromNotes(entry.sourceNotes),
      ),
    ]),
    payload: entry,
  }));
}

export function normalizeGoals(goals: GoalRecord[], patientName: PatientName): FeedEvent[] {
  // Bucket "created" events by minute-precision timestamp so goals set simultaneously appear as one feed event.
  const createdBuckets = new Map<string, { goals: GoalRecord[]; actors: FeedActor[] }>();

  for (const goal of goals) {
    const actor = mergeFeedActor(
      actorFromVersions(goal.paperTrailVersions, patientName),
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

function anthropometryObservationActors(
  snapshot: AnthropometricSnapshot,
  patientName: PatientName,
): FeedActor[] {
  if (!snapshot.observations) {
    return [];
  }

  const actors: FeedActor[] = [];
  for (const observation of Object.values(snapshot.observations)) {
    const fromVersions = actorFromVersions(observation?.paperTrailVersions, patientName);
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
  patientName: PatientName,
): FeedEvent[] {
  return (snapshots ?? []).map((snapshot) => {
    const primaryActor = mergeFeedActor(
      actorFromVersions(snapshot.paperTrailVersions, patientName),
      actorFromNotes(snapshot.notes),
    );
    const allActors = uniqueActors([
      primaryActor,
      ...anthropometryObservationActors(snapshot, patientName),
    ]);

    return {
      kind: "anthropometry",
      id: snapshot.primaryObservationId ?? snapshot.date,
      date: snapshot.date,
      actors: allActors.length > 0 ? allActors : undefined,
      payload: snapshot,
    };
  });
}

export function normalizeConditions(
  conditions: ConditionItem[],
  patientName: PatientName,
): FeedEvent[] {
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
    patientName,
  ).map((group) => ({
    kind: "condition",
    id: group.items.map((item) => item.id).join("-"),
    date: group.date,
    actors: group.actors.length > 0 ? group.actors : undefined,
    payload: group.items,
  }));
}

export function normalizeNutritionPlans(
  plans: NutritionPlanRecord[] | undefined,
  patientName: PatientName,
): FeedEvent[] {
  return bucketByMinute(
    plans ?? [],
    (plan) => plan.paperTrailVersions?.[0]?.versionInsertedAt ?? nowIso(),
    patientName,
  ).map((group) => ({
    kind: "nutrition",
    id: group.items.map((item) => item.id).join("-"),
    date: group.date,
    actors: group.actors.length > 0 ? group.actors : undefined,
    payload: group.items,
  }));
}

function questionnaireResponseAuthor(
  response: QuestionnaireResponseRecord,
  patientName: PatientName,
): FeedActor | undefined {
  const authorName = response.author?.name?.[0]?.text?.trim();
  if (authorName) {
    return { name: authorName, id: response.author?.id };
  }
  if (response.authorPatient) {
    return patientActor(response.authorPatient.id, patientName);
  }
  return undefined;
}

export function normalizeQuestionnaireResponses(
  responses: QuestionnaireResponseRecord[] | undefined,
  patientName: PatientName,
): FeedEvent[] {
  return (responses ?? []).map((response) => {
    const author = questionnaireResponseAuthor(response, patientName);
    return {
      kind: "questionnaire",
      id: response.id,
      date: response.authored ?? nowIso(),
      actors: author ? [author] : undefined,
      payload: response,
    };
  });
}

export function normalizeAllergyIntolerances(
  items: AllergyIntoleranceItem[],
  patientName: PatientName,
): FeedEvent[] {
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
      patientName,
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

export function normalizeMedications(
  items: MedicationItem[],
  patientName: PatientName,
): FeedEvent[] {
  return bucketByMinute(
    items,
    (item) =>
      item.effectiveDateTime ??
      item.dateAsserted ??
      item.paperTrailVersions?.[0]?.versionInsertedAt ??
      nowIso(),
    patientName,
  ).map((group) => ({
    kind: "medication",
    id: group.items.map((item) => item.id).join("-"),
    date: group.date,
    actors: group.actors.length > 0 ? group.actors : undefined,
    payload: group.items,
  }));
}

export function normalizePrescriptions(
  items: MedicationRequestItem[],
  patientName: PatientName,
): FeedEvent[] {
  // Prescriptions are timestamped when authored; fall back to the audit trail.
  return bucketByMinute(
    items,
    (item) => item.authoredOn ?? item.paperTrailVersions?.[0]?.versionInsertedAt ?? nowIso(),
    patientName,
  ).map((group) => ({
    kind: "prescription",
    id: group.items.map((item) => item.id).join("-"),
    date: group.date,
    actors: group.actors.length > 0 ? group.actors : undefined,
    payload: group.items,
  }));
}

export function normalizeFoodPreferences(
  items: FoodPreferenceHistoryItem[] | undefined,
  patientName: PatientName,
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
      actorFromVersions(item.paperTrailVersions, patientName),
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
