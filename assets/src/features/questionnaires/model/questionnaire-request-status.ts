import { parseISO } from "date-fns";

import type { TaskStatus } from "@/shared/types/schema-enums";

/** Where a questionnaire request stands, from the staff's point of view. */
export type QuestionnaireRequestStatus =
  | "sent"
  | "opened"
  | "overdue"
  | "completed"
  | "cancelled"
  | "expired";

// Matches the backend's open statuses: the only ones a link or session works for.
const OPEN_TASK_STATUSES: ReadonlySet<TaskStatus> = new Set<TaskStatus>([
  "REQUESTED",
  "RECEIVED",
  "ACCEPTED",
  "IN_PROGRESS",
]);

export interface QuestionnaireRequestState {
  status: TaskStatus;
  accessExpiresAt?: string | null;
  /** The due date as an instant; a request without one is never overdue. */
  dueAt?: string | null;
}

function hasPassed(instant: string | null | undefined, now: Date): boolean {
  return instant != null && parseISO(instant).getTime() <= now.getTime();
}

/**
 * Derive a request's display status. Any other closed status (failed, rejected,
 * entered in error) counts as cancelled: the request ended without answers.
 * Expired wins over overdue, because the practitioner must resend the link first.
 */
export function questionnaireRequestStatus(
  task: QuestionnaireRequestState,
  now: Date = new Date(),
): QuestionnaireRequestStatus {
  if (task.status === "COMPLETED") {
    return "completed";
  }
  if (!OPEN_TASK_STATUSES.has(task.status)) {
    return "cancelled";
  }
  if (hasPassed(task.accessExpiresAt, now)) {
    return "expired";
  }
  if (hasPassed(task.dueAt, now)) {
    return "overdue";
  }
  return task.status === "IN_PROGRESS" ? "opened" : "sent";
}

/** Whether the request can still get a new link or be cancelled. */
export function isOpenQuestionnaireRequest(status: QuestionnaireRequestStatus): boolean {
  return status === "sent" || status === "opened" || status === "overdue" || status === "expired";
}
