import type { FeedDateGroup, FeedEvent } from "@/features/customers/types/activity-feed";
import {
  getEventAccent,
  getEventCount,
  getEventIcon,
  getEventLabel,
  getEventSuffix,
  getEventVerb,
} from "@/features/customers/types/activity-feed";

import { AllergyEvent } from "./allergy-event";
import { AnthropometryEvent } from "./anthropometry-event";
import { ConditionEvent } from "./condition-event";
import { FeedEventCard } from "./feed-event-card";
import { FoodPreferenceEvent } from "./food-preference-event";
import { GoalEvent } from "./goal-event";
import { MedicationEvent } from "./medication-event";
import { ObservationEvent } from "./observation-event";
import { SubscriptionEditAction, SubscriptionEvent } from "./subscription-event";
import { TaskEvent } from "./task-event";

function EventBody({ event }: Readonly<{ event: FeedEvent }>) {
  switch (event.kind) {
    case "observation":
      return <ObservationEvent observation={event.payload} />;
    case "task":
      return <TaskEvent task={event.payload} />;
    case "goal":
      return (
        <GoalEvent
          goals={event.variant === "created" ? event.payload : [event.payload]}
          variant={event.variant}
        />
      );
    case "subscription":
      return <SubscriptionEvent variant={event.variant} pause={event.pause} />;
    case "anthropometry":
      return <AnthropometryEvent snapshot={event.payload} />;
    case "condition":
      return <ConditionEvent conditions={event.payload} />;
    case "allergy":
      return <AllergyEvent allergies={event.payload} />;
    case "medication":
      return <MedicationEvent medication={event.payload} />;
    case "food-preference":
      return <FoodPreferenceEvent preferences={event.payload} />;
  }
}

function EventAction({
  event,
  personId,
  isLatestSubscription,
}: Readonly<{ event: FeedEvent; personId: string; isLatestSubscription: boolean }>) {
  if (event.kind === "subscription" && isLatestSubscription) {
    return <SubscriptionEditAction subscription={event.payload} personId={personId} />;
  }
  return null;
}

interface ActivityFeedTimelineProps {
  groups: FeedDateGroup[];
  personId: string;
}

export function ActivityFeedTimeline({ groups, personId }: Readonly<ActivityFeedTimelineProps>) {
  if (groups.length === 0) {
    return null;
  }

  // Only the most recent subscription event is editable — earlier entries are
  // historical and shouldn't expose the edit affordance.
  let latestSubscriptionId: string | null = null;
  let latestSubscriptionTime = Number.NEGATIVE_INFINITY;
  for (const group of groups) {
    for (const event of group.events) {
      if (event.kind !== "subscription") {
        continue;
      }
      const time = new Date(event.date).getTime();
      if (time > latestSubscriptionTime) {
        latestSubscriptionTime = time;
        latestSubscriptionId = event.id;
      }
    }
  }

  return (
    <div className="max-w-2xl">
      {groups.map((group) => (
        <section
          key={group.isoDate}
          className="pb-6 last:pb-0"
          aria-labelledby={`feed-${group.isoDate}`}
        >
          <time
            id={`feed-${group.isoDate}`}
            dateTime={group.isoDate}
            className="mb-3 block font-semibold text-muted-foreground text-xs uppercase tracking-wider"
          >
            {group.label}
          </time>
          {group.events.map((event) => (
            <FeedEventCard
              key={event.id}
              accent={getEventAccent(event)}
              icon={getEventIcon(event)}
              label={getEventLabel(event)}
              verb={getEventVerb(event, getEventCount(event))}
              suffix={getEventSuffix(event)}
              action={
                <EventAction
                  event={event}
                  personId={personId}
                  isLatestSubscription={event.id === latestSubscriptionId}
                />
              }
              actor={event.actor}
              date={event.date}
              isFuture={group.isFuture}
            >
              <EventBody event={event} />
            </FeedEventCard>
          ))}
        </section>
      ))}
    </div>
  );
}
