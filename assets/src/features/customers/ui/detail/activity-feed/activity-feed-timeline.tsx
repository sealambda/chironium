import type { FeedDateGroup } from "@/features/customers/types/activity-feed";
import {
  getEventAccent,
  getEventCount,
  getEventIcon,
  getEventLabel,
  getEventVerb,
} from "@/features/customers/types/activity-feed";

import { EventAction } from "./activity-feed-timeline-actions";
import { EventBadge, EventBody } from "./activity-feed-timeline-event-body";
import { FeedEventCard } from "./feed-event-card";

interface ActivityFeedTimelineProps {
  groups: FeedDateGroup[];
  personId: string;
  patientId: string | null;
  organizationId: string;
  currentSubscriptionId: string | null;
}

function findActionableSubscriptionEventId(
  groups: FeedDateGroup[],
  currentSubscriptionId: string | null,
): string | null {
  if (!currentSubscriptionId) {
    return null;
  }

  let eventId: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;

  for (const group of groups) {
    for (const event of group.events) {
      if (event.kind !== "subscription" || event.payload.id !== currentSubscriptionId) {
        continue;
      }

      const time = new Date(event.date).getTime();
      if (time > latestTime) {
        latestTime = time;
        eventId = event.id;
      }
    }
  }

  return eventId;
}

export function ActivityFeedTimeline({
  groups,
  personId,
  patientId,
  organizationId,
  currentSubscriptionId,
}: Readonly<ActivityFeedTimelineProps>) {
  if (groups.length === 0) {
    return null;
  }

  const actionableSubscriptionEventId = findActionableSubscriptionEventId(
    groups,
    currentSubscriptionId,
  );

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
            className="mb-3 block text-xs font-semibold tracking-wider text-muted-foreground uppercase"
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
              action={
                <EventAction
                  event={event}
                  personId={personId}
                  organizationId={organizationId}
                  patientId={patientId}
                  isCurrentSubscriptionActionEvent={event.id === actionableSubscriptionEventId}
                />
              }
              actors={event.actors}
              date={event.date}
              dateBadge={<EventBadge event={event} />}
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
