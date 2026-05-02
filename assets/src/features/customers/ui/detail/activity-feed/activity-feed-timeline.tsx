import { Pencil } from "lucide-react";
import { useState } from "react";

import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import type { FeedDateGroup, FeedEvent } from "@/features/customers/types/activity-feed";
import {
  getEventAccent,
  getEventCount,
  getEventIcon,
  getEventLabel,
  getEventSuffix,
  getEventVerb,
} from "@/features/customers/types/activity-feed";
import { AddGoalDialog } from "@/features/customers/ui/detail/add-goal-dialog";
import { EditAnthropometryDialog } from "@/features/customers/ui/detail/edit-anthropometry-dialog";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";

import { AllergyEvent } from "./allergy-event";
import { AnthropometryEvent } from "./anthropometry-event";
import { ConditionEvent } from "./condition-event";
import { FeedEventCard } from "./feed-event-card";
import { FoodPreferenceEvent } from "./food-preference-event";
import { GoalEvent } from "./goal-event";
import { MedicationEvent } from "./medication-event";
import { MenstrualCycleEvent } from "./menstrual-cycle-event";
import { ObservationEvent } from "./observation-event";
import { SubscriptionEditAction, SubscriptionEvent } from "./subscription-event";
import { TaskEvent } from "./task-event";

function EditChevron({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="rounded-full text-muted-foreground hover:text-foreground"
      aria-label={m.history_edit_element_title()}
      onClick={onClick}
    >
      <Pencil aria-hidden />
    </Button>
  );
}

function AnthropometryEditAction({
  personId,
  snapshot,
}: Readonly<{ personId: string; snapshot: AnthropometricSnapshot }>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <EditChevron onClick={() => setOpen(true)} />
      <EditAnthropometryDialog
        personId={personId}
        snapshot={snapshot}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function GoalEditAction({
  personId,
  patientId,
  goal,
}: Readonly<{ personId: string; patientId: string; goal: GoalRecord }>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <EditChevron onClick={() => setOpen(true)} />
      <AddGoalDialog
        personId={personId}
        patientId={patientId}
        editGoal={goal}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function singleEditableGoal(event: Extract<FeedEvent, { kind: "goal" }>): GoalRecord | null {
  if (event.variant === "due") {
    return event.payload;
  }
  return event.payload.length === 1 ? (event.payload[0] ?? null) : null;
}

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
    case "menstrual":
      return <MenstrualCycleEvent cycle={event.payload} />;
    case "food-preference":
      return <FoodPreferenceEvent preferences={event.payload} />;
  }
}

function EventAction({
  event,
  personId,
  patientId,
  isLatestSubscription,
}: Readonly<{
  event: FeedEvent;
  personId: string;
  patientId: string | null;
  isLatestSubscription: boolean;
}>) {
  if (event.kind === "subscription" && isLatestSubscription) {
    return <SubscriptionEditAction subscription={event.payload} personId={personId} />;
  }
  if (event.kind === "anthropometry") {
    return <AnthropometryEditAction personId={personId} snapshot={event.payload} />;
  }
  if (event.kind === "goal" && patientId) {
    const goal = singleEditableGoal(event);
    return goal ? <GoalEditAction personId={personId} patientId={patientId} goal={goal} /> : null;
  }
  return null;
}

interface ActivityFeedTimelineProps {
  groups: FeedDateGroup[];
  personId: string;
  patientId: string | null;
}

export function ActivityFeedTimeline({
  groups,
  personId,
  patientId,
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
              suffix={getEventSuffix(event)}
              action={
                <EventAction
                  event={event}
                  personId={personId}
                  patientId={patientId}
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
