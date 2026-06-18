import { addDays, parseISO } from "date-fns";

import type { FeedActor, FeedEvent } from "@/features/customers/types/activity-feed";
import { actorFromVersions, uniqueActors } from "@/features/customers/types/activity-feed";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";

const SUBSCRIPTION_ENDING_HORIZON_DAYS = 90;

type SubscriptionPause = NonNullable<SubscriptionRecord["pauses"]>[number];
type SubscriptionActor = FeedActor | undefined;

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
      actors: uniqueActors([actor]),
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
      actors: uniqueActors([actor]),
      variant: isCancellation ? "cancelled" : "resumed",
      payload: subscription,
      pause,
    });
  }

  return events;
}

function finishEvent(
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
    id: `${subscription.id}-finished`,
    date: endIso,
    actors: uniqueActors([actor]),
    variant: "finished",
    payload: subscription,
  };
}

export function normalizeSubscriptions(
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
        actors: uniqueActors([actor]),
        variant: "started",
        payload: subscription,
      });
    }

    events.push(...pauseEvents(subscription, actor));

    const finished = finishEvent(subscription, actor, horizon);
    if (finished) {
      events.push(finished);
    }
  }

  return events;
}
