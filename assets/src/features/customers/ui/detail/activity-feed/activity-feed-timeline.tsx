import type { FeedDateGroup } from "@/features/customers/types/activity-feed";
import {
  getEventAccent,
  getEventCount,
  getEventIcon,
  getEventLabel,
  getEventVerb,
} from "@/features/customers/types/activity-feed";

import { EventAction } from "./activity-feed-timeline-actions";
import { EventBody, TaskStatusBadge } from "./activity-feed-timeline-event-body";
import { FeedEventCard } from "./feed-event-card";

interface ActivityFeedTimelineProps {
  groups: FeedDateGroup[];
  personId: string;
  patientId: string | null;
  organizationId: string;
}

export function ActivityFeedTimeline({
  groups,
  personId,
  patientId,
  organizationId,
}: Readonly<ActivityFeedTimelineProps>) {
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
              action={
                <EventAction
                  event={event}
                  personId={personId}
                  organizationId={organizationId}
                  patientId={patientId}
                  isLatestSubscription={event.id === latestSubscriptionId}
                />
              }
              actors={event.actors}
              date={event.date}
              dateBadge={
                event.kind === "task" ? (
                  <TaskStatusBadge status={event.payload.status} />
                ) : undefined
              }
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
