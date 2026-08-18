import { useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Pause, Pencil, RotateCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import type {
  MenstrualCycleEntry,
  ObservationItem,
} from "@/features/customers/api/observations-api";
import type { FeedDateGroup, FeedEvent } from "@/features/customers/types/activity-feed";
import {
  getEventAccent,
  getEventCount,
  getEventIcon,
  getEventLabel,
  getEventVerb,
} from "@/features/customers/types/activity-feed";
import { AddGoalDialog } from "@/features/customers/ui/detail/add-goal-dialog";
import { AddMenstrualCycleDialog } from "@/features/customers/ui/detail/add-menstrual-cycle-dialog";
import { EditAnthropometryDialog } from "@/features/customers/ui/detail/edit-anthropometry-dialog";
import { EditObservationDialog } from "@/features/customers/ui/detail/edit-observation-dialog";
import { EditSubscriptionDialog } from "@/features/customers/ui/detail/edit-subscription-dialog";
import { EditTaskReminderDialog } from "@/features/customers/ui/detail/edit-task-reminder-dialog";
import {
  CancelActionDialog,
  ResumeActionDialog,
  SuspendActionDialog,
} from "@/features/customers/ui/detail/subscription-management-dialogs";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import type { PatientTask } from "@/features/tasks/api/tasks-api";
import { completeTaskReminder } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { customersQueryKeys, personQueryKeys, tasksListQueryKey } from "@/shared/utils/query-keys";

import { AllergyEvent } from "./allergy-event";
import { AnthropometryEvent } from "./anthropometry-event";
import { ConditionEvent } from "./condition-event";
import { FeedEventCard } from "./feed-event-card";
import { FoodPreferenceEvent } from "./food-preference-event";
import { GoalEvent } from "./goal-event";
import { MedicationEvent } from "./medication-event";
import { MenstrualCycleEvent } from "./menstrual-cycle-event";
import { NutritionEvent } from "./nutrition-event";
import { ObservationEvent } from "./observation-event";
import { PrescriptionEvent } from "./prescription-event";
import { QuestionnaireEvent } from "./questionnaire-event";
import { SubscriptionEvent } from "./subscription-event";
import { TaskEvent } from "./task-event";

type BadgeVariant = "success" | "warning" | "destructive" | "info" | "secondary";

function taskStatusBadgeConfig(
  status: PatientTask["status"],
): { variant: BadgeVariant; label: string } | null {
  switch (status) {
    case "READY":
      return { variant: "secondary", label: m.task_status_ready() };
    case "IN_PROGRESS":
      return { variant: "info", label: m.task_status_in_progress() };
    case "ON_HOLD":
      return { variant: "warning", label: m.task_status_on_hold() };
    case "COMPLETED":
      return { variant: "success", label: m.task_status_completed() };
    case "CANCELLED":
      return { variant: "secondary", label: m.task_status_cancelled() };
    case "FAILED":
      return { variant: "destructive", label: m.task_status_failed() };
    default:
      return null;
  }
}

function TaskStatusBadge({ status }: Readonly<{ status: PatientTask["status"] }>) {
  const config = taskStatusBadgeConfig(status);
  if (!config) {
    return null;
  }
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function EditChevron({ onClick, title }: Readonly<{ onClick: () => void; title?: string }>) {
  const label = title ?? m.history_edit_element_title();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="rounded-full text-muted-foreground hover:text-foreground"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Pencil aria-hidden />
    </Button>
  );
}

function CompleteChevron({
  onClick,
  loading,
}: Readonly<{ onClick: () => void; loading: boolean }>) {
  const label = m.review_task_complete();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="rounded-full text-muted-foreground hover:text-foreground"
      aria-label={label}
      title={label}
      onClick={onClick}
      loading={loading}
      disabled={loading}
    >
      <Check aria-hidden />
    </Button>
  );
}

function AnthropometryEditAction({
  personId,
  patientId,
  snapshot,
}: Readonly<{ personId: string; patientId: string | null; snapshot: AnthropometricSnapshot }>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <EditChevron onClick={() => setOpen(true)} />
      <EditAnthropometryDialog
        personId={personId}
        patientId={patientId}
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

function ObservationEditAction({
  personId,
  observation,
}: Readonly<{ personId: string; observation: ObservationItem }>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <EditChevron onClick={() => setOpen(true)} />
      <EditObservationDialog
        personId={personId}
        observation={observation}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function SubscriptionEditAction({
  personId,
  subscription,
}: Readonly<{
  personId: string;
  subscription: Extract<FeedEvent, { kind: "subscription" }>["payload"];
}>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <EditChevron onClick={() => setOpen(true)} />
      <EditSubscriptionDialog
        personId={personId}
        currentSubscription={subscription}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function SubscriptionFeedActions({
  personId,
  organizationId,
  subscription,
}: Readonly<{
  personId: string;
  organizationId: string;
  subscription: Extract<FeedEvent, { kind: "subscription" }>["payload"];
}>) {
  const queryClient = useQueryClient();

  const invalidateSubscriptionQueries = async () => {
    await Promise.all([
      invalidatePersonDetail(queryClient, personId),
      queryClient.invalidateQueries({
        queryKey: personQueryKeys.subscriptions(personId, organizationId),
      }),
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.personsPrefix(organizationId),
      }),
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.subscriptions(organizationId),
      }),
    ]);
  };

  return (
    <div className="flex items-center gap-1">
      {subscription.state === "active" ? (
        <>
          <SuspendActionDialog
            subscriptionId={subscription.id}
            organizationId={organizationId}
            onMutated={invalidateSubscriptionQueries}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-muted-foreground hover:text-foreground"
                aria-label={m.subscription_action_suspend()}
                title={m.subscription_action_suspend()}
              >
                <Pause aria-hidden />
              </Button>
            }
          />
          <CancelActionDialog
            subscriptionId={subscription.id}
            organizationId={organizationId}
            onMutated={invalidateSubscriptionQueries}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-muted-foreground hover:text-destructive"
                aria-label={m.subscription_action_cancel()}
                title={m.subscription_action_cancel()}
              >
                <Ban aria-hidden />
              </Button>
            }
          />
        </>
      ) : (
        <ResumeActionDialog
          subscriptionId={subscription.id}
          organizationId={organizationId}
          onMutated={invalidateSubscriptionQueries}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground hover:text-foreground"
              aria-label={m.subscription_action_resume()}
              title={m.subscription_action_resume()}
            >
              <RotateCw aria-hidden />
            </Button>
          }
        />
      )}
      <SubscriptionEditAction subscription={subscription} personId={personId} />
    </div>
  );
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

function MenstrualCycleEditAction({
  personId,
  patientId,
  cycle,
}: Readonly<{ personId: string; patientId: string | null; cycle: MenstrualCycleEntry }>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <EditChevron onClick={() => setOpen(true)} />
      <AddMenstrualCycleDialog
        personId={personId}
        patientId={patientId}
        mode="edit"
        initialCycle={cycle}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function TaskReminderEditAction({
  personId,
  task,
}: Readonly<{
  personId: string;
  task: Extract<FeedEvent, { kind: "task" }>["payload"];
}>) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const isCompleted = task.status === "COMPLETED";

  return (
    <div className="flex items-center gap-1">
      {!isCompleted && (
        <CompleteChevron
          loading={completing}
          onClick={() => {
            if (!selectedOrg?.id || completing) {
              return;
            }

            setCompleting(true);
            completeTaskReminder(task.id, selectedOrg.id)
              .then(async () => {
                await Promise.all([
                  queryClient.invalidateQueries({
                    queryKey: personQueryKeys.reviewTasksScope(personId),
                  }),
                  queryClient.invalidateQueries({
                    queryKey: personQueryKeys.patientTasksScope(personId),
                  }),
                  queryClient.invalidateQueries({ queryKey: tasksListQueryKey(selectedOrg.id) }),
                ]);
                toast.success(m.review_task_completed());
              })
              .catch(() => {
                toast.error(m.onboarding_error());
              })
              .finally(() => {
                setCompleting(false);
              });
          }}
        />
      )}
      <EditChevron onClick={() => setOpen(true)} />
      <EditTaskReminderDialog personId={personId} task={task} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function singleEditableGoal(event: Extract<FeedEvent, { kind: "goal" }>): GoalRecord | null {
  return event.payload.length === 1 ? (event.payload[0] ?? null) : null;
}

function EventBody({ event }: Readonly<{ event: FeedEvent }>) {
  switch (event.kind) {
    case "observation":
      return <ObservationEvent observation={event.payload} />;
    case "task":
      return <TaskEvent task={event.payload} />;
    case "goal":
      return <GoalEvent goals={event.payload} />;
    case "subscription":
      return (
        <SubscriptionEvent
          variant={event.variant}
          planName={event.payload.plan?.name}
          pause={event.pause}
        />
      );
    case "anthropometry":
      return <AnthropometryEvent snapshot={event.payload} />;
    case "condition":
      return <ConditionEvent conditions={event.payload} />;
    case "allergy":
      return <AllergyEvent allergies={event.payload} />;
    case "medication":
      return <MedicationEvent medication={event.payload} />;
    case "prescription":
      return <PrescriptionEvent prescriptions={event.payload} />;
    case "menstrual":
      return <MenstrualCycleEvent cycle={event.payload} />;
    case "food-preference":
      return <FoodPreferenceEvent preferences={event.payload} />;
    case "nutrition":
      return <NutritionEvent plans={event.payload} />;
    case "questionnaire":
      return <QuestionnaireEvent response={event.payload} />;
  }
}

function EventAction({
  event,
  personId,
  organizationId,
  patientId,
  isCurrentSubscriptionActionEvent,
}: Readonly<{
  event: FeedEvent;
  personId: string;
  organizationId: string;
  patientId: string | null;
  isCurrentSubscriptionActionEvent: boolean;
}>) {
  if (event.kind === "subscription" && isCurrentSubscriptionActionEvent) {
    return (
      <SubscriptionFeedActions
        personId={personId}
        organizationId={organizationId}
        subscription={event.payload}
      />
    );
  }
  if (event.kind === "anthropometry") {
    return (
      <AnthropometryEditAction personId={personId} patientId={patientId} snapshot={event.payload} />
    );
  }
  if (event.kind === "goal" && patientId) {
    const goal = singleEditableGoal(event);
    return goal ? <GoalEditAction personId={personId} patientId={patientId} goal={goal} /> : null;
  }
  if (event.kind === "observation") {
    return <ObservationEditAction personId={personId} observation={event.payload} />;
  }
  if (event.kind === "task") {
    return <TaskReminderEditAction personId={personId} task={event.payload} />;
  }
  if (event.kind === "menstrual") {
    return (
      <MenstrualCycleEditAction personId={personId} patientId={patientId} cycle={event.payload} />
    );
  }
  return null;
}

interface ActivityFeedTimelineProps {
  groups: FeedDateGroup[];
  personId: string;
  patientId: string | null;
  organizationId: string;
  currentSubscriptionId: string | null;
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
                  isCurrentSubscriptionActionEvent={event.id === actionableSubscriptionEventId}
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
