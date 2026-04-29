import { addDays, formatDistanceToNowStrict, isFuture, isToday, parseISO } from "date-fns";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { ConditionItem } from "@/features/customers/api/condition-api";
import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import type { MedicationItem } from "@/features/customers/api/medications-api";
import type { ObservationsPage } from "@/features/customers/api/observations-api";
import type {
  FeedActor,
  FeedDateGroup,
  FeedEvent,
  FeedEventKind,
  VersionActorSource,
} from "@/features/customers/types/activity-feed";
import {
  actorFromNotes,
  actorFromVersions,
  mergeFeedActor,
} from "@/features/customers/types/activity-feed";
import type { PatientTask } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";
import { getDateLocale } from "@/shared/utils/date-locale";

const SUBSCRIPTION_ENDING_HORIZON_DAYS = 90;

type SubscriptionPause = NonNullable<SubscriptionRecord["pauses"]>[number];
type SubscriptionActor = FeedActor | undefined;

type Trackable = {
  id: string;
  paperTrailVersions?: VersionActorSource[] | null;
  note?: readonly { authorString?: string | null }[] | null;
};

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
  activeFilter: FeedEventKind | "all";
  personName?: string | null;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeObservations(page: ObservationsPage | undefined): FeedEvent[] {
  return (page?.items ?? []).map((observation) => ({
    kind: "observation",
    id: observation.id,
    date: observation.effectiveDateTime ?? nowIso(),
    actor: actorFromNotes(observation.note),
    payload: observation,
  }));
}

function normalizeTasks(tasks: PatientTask[] | undefined): FeedEvent[] {
  return (tasks ?? []).map((task) => ({
    kind: "task",
    id: task.id,
    date: task.requestedPeriod?.start ?? nowIso(),
    actor: actorFromNotes(task.note),
    payload: task,
  }));
}

function normalizeGoals(goals: GoalRecord[]): FeedEvent[] {
  // Bucket "created" events by minute-precision timestamp so goals set simultaneously appear as one feed event.
  const createdBuckets = new Map<
    string,
    { goals: GoalRecord[]; actor: ReturnType<typeof actorFromNotes> }
  >();
  const dueEvents: FeedEvent[] = [];

  for (const goal of goals) {
    const actor = actorFromNotes(goal.note);
    const rawDate =
      goal.note?.[0]?.time ??
      (goal.startDate ? `${goal.startDate}T00:00:00.000Z` : null) ??
      nowIso();
    // Truncate to minute precision for bucketing.
    const bucketKey = rawDate.slice(0, 16);

    const bucket = createdBuckets.get(bucketKey);
    if (bucket) {
      bucket.goals.push(goal);
    } else {
      createdBuckets.set(bucketKey, { goals: [goal], actor });
    }

    if (goal.dueDate) {
      dueEvents.push({
        kind: "goal",
        id: `${goal.id}-due`,
        date: `${goal.dueDate}T00:00:00.000Z`,
        actor,
        variant: "due",
        payload: goal,
      });
    }
  }

  const createdEvents: FeedEvent[] = Array.from(createdBuckets.entries()).map(
    ([bucketKey, { goals: bucketGoals, actor }]) => ({
      kind: "goal",
      id: `goal-created-${bucketKey}`,
      date: `${bucketKey}:00.000Z`,
      actor,
      variant: "created",
      payload: bucketGoals,
    }),
  );

  return [...createdEvents, ...dueEvents];
}

function normalizeAnthropometry(snapshots: AnthropometricSnapshot[] | undefined): FeedEvent[] {
  return (snapshots ?? []).map((snapshot) => ({
    kind: "anthropometry",
    id: snapshot.primaryObservationId ?? snapshot.date,
    date: snapshot.date,
    actor: mergeFeedActor(
      actorFromVersions(snapshot.paperTrailVersions),
      actorFromNotes(snapshot.notes),
    ),
    payload: snapshot,
  }));
}

function bucketByMinute<RecordItem extends Trackable>(
  records: readonly RecordItem[],
  getDate: (record: RecordItem) => string,
): { date: string; actor: FeedActor | undefined; items: RecordItem[] }[] {
  const buckets = new Map<
    string,
    { date: string; actor: FeedActor | undefined; items: RecordItem[] }
  >();

  for (const record of records) {
    const date = getDate(record);
    const key = date.slice(0, 16);
    const existingBucket = buckets.get(key);

    if (existingBucket) {
      existingBucket.items.push(record);
      continue;
    }

    buckets.set(key, {
      date,
      actor: mergeFeedActor(
        actorFromVersions(record.paperTrailVersions),
        actorFromNotes(record.note),
      ),
      items: [record],
    });
  }

  return Array.from(buckets.values());
}

function normalizeConditions(conditions: ConditionItem[]): FeedEvent[] {
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
    actor: group.actor,
    payload: group.items,
  }));
}

function normalizeAllergyIntolerances(items: AllergyIntoleranceItem[]): FeedEvent[] {
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
      actor: group.actor,
      aiType,
      payload: group.items,
    }));

  return [...buildEvents(allergies, "ALLERGY"), ...buildEvents(intolerances, "INTOLERANCE")];
}

function normalizeMedications(items: MedicationItem[]): FeedEvent[] {
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
    actor: group.actor,
    payload: group.items,
  }));
}

function normalizeFoodPreferences(items: FoodPreferenceHistoryItem[] | undefined): FeedEvent[] {
  const buckets = new Map<
    string,
    {
      date: string;
      actor: FeedActor | undefined;
      variant: "inclusion" | "exclusion";
      items: FoodPreferenceHistoryItem[];
    }
  >();

  for (const item of items ?? []) {
    const date = item.date ?? nowIso();
    const key = `${date.slice(0, 16)}-${item.type}`;
    const existingBucket = buckets.get(key);

    if (existingBucket) {
      existingBucket.items.push(item);
      continue;
    }

    buckets.set(key, {
      date,
      actor: actorFromNotes(item.notes),
      variant: item.type,
      items: [item],
    });
  }

  return Array.from(buckets.values()).map((group) => ({
    kind: "food-preference",
    id: group.items.map((item) => item.id).join("-"),
    date: group.date,
    actor: group.actor,
    variant: group.variant,
    payload: group.items,
  }));
}

function latestClosedPause(pauses: readonly SubscriptionPause[]): SubscriptionPause | null {
  return pauses.reduce<SubscriptionPause | null>((latest, pause) => {
    if (!pause.endDate) {
      return latest;
    }
    if (!latest?.endDate || pause.endDate > latest.endDate) {
      return pause;
    }
    return latest;
  }, null);
}

function pauseEvents(subscription: SubscriptionRecord, actor: SubscriptionActor): FeedEvent[] {
  const pauses = subscription.pauses ?? [];
  const latestClosed = latestClosedPause(pauses);
  const events: FeedEvent[] = [];

  for (const pause of pauses) {
    events.push({
      kind: "subscription",
      id: `${pause.id}-paused`,
      date: `${pause.startDate}T00:00:00.000Z`,
      actor,
      variant: "paused",
      payload: subscription,
      pause,
    });

    if (!pause.endDate) {
      continue;
    }

    const isCancellation = subscription.state === "canceled" && pause.id === latestClosed?.id;
    events.push({
      kind: "subscription",
      id: `${pause.id}-${isCancellation ? "cancelled" : "resumed"}`,
      date: `${pause.endDate}T00:00:00.000Z`,
      actor,
      variant: isCancellation ? "cancelled" : "resumed",
      payload: subscription,
      pause,
    });
  }

  return events;
}

function endingEvent(
  subscription: SubscriptionRecord,
  actor: SubscriptionActor,
  horizon: Date,
): FeedEvent | null {
  if (subscription.state !== "active" || !subscription.effectiveEndDate) {
    return null;
  }

  const endIso = `${subscription.effectiveEndDate}T00:00:00.000Z`;
  if (parseISO(endIso) > horizon) {
    return null;
  }

  return {
    kind: "subscription",
    id: `${subscription.id}-ending`,
    date: endIso,
    actor,
    variant: "ending",
    payload: subscription,
  };
}

function normalizeSubscriptions(
  subscriptions: SubscriptionRecord[],
  personName: string | null | undefined,
): FeedEvent[] {
  const horizon = addDays(new Date(), SUBSCRIPTION_ENDING_HORIZON_DAYS);
  const events: FeedEvent[] = [];

  for (const subscription of subscriptions) {
    const recorder = actorFromVersions(subscription.paperTrailVersions);
    // The subject of a subscription event is the patient: render the patient
    // as the actor and the practitioner who recorded it as the note author.
    const trimmedPerson = personName?.trim();
    let actor: SubscriptionActor;
    if (trimmedPerson) {
      const noteAuthor = recorder && recorder.name !== trimmedPerson ? recorder.name : undefined;
      actor = { name: trimmedPerson, noteAuthorName: noteAuthor };
    } else if (recorder) {
      actor = { name: recorder.name, id: recorder.id };
    } else {
      actor = undefined;
    }

    if (subscription.startDate) {
      events.push({
        kind: "subscription",
        id: `${subscription.id}-started`,
        date: `${subscription.startDate}T00:00:00.000Z`,
        actor,
        variant: "started",
        payload: subscription,
      });
    }

    events.push(...pauseEvents(subscription, actor));

    const ending = endingEvent(subscription, actor, horizon);
    if (ending) {
      events.push(ending);
    }
  }

  return events;
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
  ];
  const filtered =
    activeFilter === "all" ? events : events.filter((event) => event.kind === activeFilter);

  return filtered.sort((left, right) => right.date.localeCompare(left.date));
}

function isoDateString(isoTimestamp: string) {
  return isoTimestamp.slice(0, 10);
}

function dateGroupLabel(isoDate: string, today: boolean) {
  if (today) {
    return m.activity_today();
  }
  return formatDistanceToNowStrict(parseISO(isoDate), {
    addSuffix: true,
    locale: getDateLocale(),
  });
}

export function groupFeedEventsByDate(events: FeedEvent[]): FeedDateGroup[] {
  const map = new Map<string, FeedDateGroup>();

  for (const event of events) {
    const isoDate = isoDateString(event.date);
    const today = isToday(parseISO(isoDate));
    const group = map.get(isoDate);

    if (group) {
      group.events.push(event);
      continue;
    }

    map.set(isoDate, {
      isoDate,
      label: dateGroupLabel(isoDate, today),
      events: [event],
      isToday: today,
      isFuture: !today && isFuture(parseISO(isoDate)),
    });
  }

  return Array.from(map.values()).sort((left, right) => right.isoDate.localeCompare(left.isoDate));
}
