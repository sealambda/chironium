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
import type { FeedEvent } from "@/features/customers/types/activity-feed";
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
import {
  invalidatePatientTasks,
  invalidatePersonDetail,
} from "@/features/customers/utils/person-detail-cache";
import { isOpenQuestionnaireRequest } from "@/features/questionnaires/model/questionnaire-request-status";
import { QuestionnaireRequestActions } from "@/features/questionnaires/ui/request/questionnaire-request-actions";
import { completeTaskReminder } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { useOrg } from "@/shared/session/use-org";
import { Button } from "@/shared/ui/button";
import { customersQueryKeys, personQueryKeys } from "@/shared/utils/query-keys";

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
}: Readonly<{
  personId: string;
  patientId: string | null;
  snapshot: AnthropometricSnapshot;
}>) {
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

function MenstrualCycleEditAction({
  personId,
  patientId,
  cycle,
}: Readonly<{
  personId: string;
  patientId: string | null;
  cycle: MenstrualCycleEntry;
}>) {
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
                await invalidatePatientTasks(queryClient, personId, selectedOrg.id);
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

export function EventAction({
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
  if (event.kind === "questionnaire-request" && isOpenQuestionnaireRequest(event.status)) {
    return (
      <QuestionnaireRequestActions
        personId={personId}
        organizationId={organizationId}
        taskId={event.payload.id}
        status={event.status}
      />
    );
  }
  if (event.kind === "menstrual") {
    return (
      <MenstrualCycleEditAction personId={personId} patientId={patientId} cycle={event.payload} />
    );
  }
  return null;
}
