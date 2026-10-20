import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

import type { QuestionnaireRequestStatus } from "@/features/questionnaires/model/questionnaire-request-status";
import { isOpenQuestionnaireRequest } from "@/features/questionnaires/model/questionnaire-request-status";
import type { PatientTask } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { getDateLocale } from "@/shared/utils/date-locale";

type BadgeVariant = "secondary" | "info" | "success" | "warning";

const STATUS_BADGE: Record<
  QuestionnaireRequestStatus,
  { variant: BadgeVariant; label: () => string }
> = {
  sent: { variant: "secondary", label: m.questionnaire_request_status_sent },
  opened: { variant: "info", label: m.questionnaire_request_status_opened },
  overdue: { variant: "warning", label: m.questionnaire_request_status_overdue },
  completed: { variant: "success", label: m.questionnaire_request_status_completed },
  cancelled: { variant: "secondary", label: m.questionnaire_request_status_cancelled },
  expired: { variant: "warning", label: m.questionnaire_request_status_expired },
};

export function QuestionnaireRequestStatusBadge({
  status,
}: Readonly<{ status: QuestionnaireRequestStatus }>) {
  const { variant, label } = STATUS_BADGE[status];
  return <Badge variant={variant}>{label()}</Badge>;
}

function linkExpiryText(status: QuestionnaireRequestStatus, expiresAt: string): string {
  const time = formatDistanceToNowStrict(parseISO(expiresAt), {
    addSuffix: true,
    locale: getDateLocale(),
  });
  return status === "expired"
    ? m.questionnaire_request_link_expired({ time })
    : m.questionnaire_request_link_expires({ time });
}

interface QuestionnaireRequestEventProps {
  task: PatientTask;
  status: QuestionnaireRequestStatus;
}

/** Timeline body for a questionnaire sent to the patient: title, message, due date and link expiry. */
export function QuestionnaireRequestEvent({
  task,
  status,
}: Readonly<QuestionnaireRequestEventProps>) {
  const title = task.focusQuestionnaire?.title || m.questionnaire_untitled();
  const dueAt = task.requestedPeriod?.end;
  const expiresAt = isOpenQuestionnaireRequest(status) ? task.accessExpiresAt : null;
  const details = [
    dueAt
      ? m.questionnaire_request_due({
          date: format(parseISO(dueAt), "PP", { locale: getDateLocale() }),
        })
      : null,
    expiresAt ? linkExpiryText(status, expiresAt) : null,
  ].filter((detail): detail is string => detail !== null);

  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card px-3 py-2">
      <p className="font-medium text-foreground text-sm">{title}</p>
      {task.description ? (
        <p className="whitespace-pre-line text-foreground/80 text-sm">{task.description}</p>
      ) : null}
      {details.length > 0 ? (
        <p className="text-muted-foreground text-xs">{details.join(" · ")}</p>
      ) : null}
    </div>
  );
}
