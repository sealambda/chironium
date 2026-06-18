import type { FeedEvent } from "@/features/customers/types/activity-feed";
import { isSelfReportedEvent } from "@/features/customers/types/activity-feed";
import { SelfReportedBadge } from "@/features/customers/ui/detail/self-reported-badge";
import type { PatientTask } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";

import { AllergyEvent } from "./allergy-event";
import { AnthropometryEvent } from "./anthropometry-event";
import { ConditionEvent } from "./condition-event";
import { FoodPreferenceEvent } from "./food-preference-event";
import { GoalEvent } from "./goal-event";
import { MedicationEvent } from "./medication-event";
import { MenstrualCycleEvent } from "./menstrual-cycle-event";
import { NutritionEvent } from "./nutrition-event";
import { ObservationEvent } from "./observation-event";
import { PrescriptionEvent } from "./prescription-event";
import { QuestionnaireEvent } from "./questionnaire-event";
import {
  QuestionnaireRequestEvent,
  QuestionnaireRequestStatusBadge,
} from "./questionnaire-request-event";
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

export function TaskStatusBadge({ status }: Readonly<{ status: PatientTask["status"] }>) {
  const config = taskStatusBadgeConfig(status);
  if (!config) {
    return null;
  }
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function EventBody({ event }: Readonly<{ event: FeedEvent }>) {
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
    case "questionnaire-request":
      return <QuestionnaireRequestEvent task={event.payload} status={event.status} />;
  }
}

export function EventBadge({ event }: Readonly<{ event: FeedEvent }>) {
  if (event.kind === "task") {
    return <TaskStatusBadge status={event.payload.status} />;
  }
  if (event.kind === "questionnaire-request") {
    return <QuestionnaireRequestStatusBadge status={event.status} />;
  }
  return isSelfReportedEvent(event) ? <SelfReportedBadge /> : null;
}
