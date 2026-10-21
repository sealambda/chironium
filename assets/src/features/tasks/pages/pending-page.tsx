import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { Check, CircleCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { QuestionnaireRequestStatusBadge } from "@/features/customers/ui/detail/activity-feed/questionnaire-request-event";
import { invalidatePatientTasks } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import type { QuestionnaireLink } from "@/features/questionnaires/api/questionnaire-requests-api";
import { questionnaireRequestStatus } from "@/features/questionnaires/model/questionnaire-request-status";
import { QuestionnaireLinkDialog } from "@/features/questionnaires/ui/request/questionnaire-link-dialog";
import { QuestionnaireRequestActions } from "@/features/questionnaires/ui/request/questionnaire-request-actions";
import {
  completeTaskReminder,
  isQuestionnaireRequestTask,
  type PendingTask,
} from "@/features/tasks/api/tasks-api";
import { usePendingTasks } from "@/features/tasks/hooks/use-pending-tasks";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Loading } from "@/shared/ui/loading";
import { getDateLocale } from "@/shared/utils/date-locale";
import { inZone } from "@/shared/utils/date-time-input";
import { formatPersonName } from "@/shared/utils/person-utils";

/** "Due Oct 12 · 3 days late" once the due date has passed, else "Link expired 2 days ago". */
function whenText(task: PendingTask, timeZone: string | undefined): string | null {
  if (task.dueAt && parseISO(task.dueAt).getTime() <= Date.now()) {
    const due = parseISO(task.dueAt);
    return [
      m.pending_due({ date: format(due, "PP", { locale: getDateLocale(), ...inZone(timeZone) }) }),
      m.pending_late({ time: formatDistanceToNowStrict(due, { locale: getDateLocale() }) }),
    ].join(" · ");
  }
  if (task.accessExpiresAt) {
    return m.questionnaire_request_link_expired({
      time: formatDistanceToNowStrict(parseISO(task.accessExpiresAt), {
        addSuffix: true,
        locale: getDateLocale(),
      }),
    });
  }
  return null;
}

function MarkDoneButton({
  task,
  personId,
  organizationId,
}: Readonly<{ task: PendingTask; personId: string; organizationId: string }>) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const markDone = async () => {
    setBusy(true);
    try {
      await completeTaskReminder(task.id, organizationId);
      await invalidatePatientTasks(queryClient, personId, organizationId);
      toast.success(m.review_task_completed());
    } catch {
      toast.error(m.pending_mark_done_error());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" loading={busy} onClick={markDone}>
      <Check aria-hidden />
      {m.pending_mark_done()}
    </Button>
  );
}

function PendingRow({
  task,
  organizationId,
  onLinkIssued,
}: Readonly<{
  task: PendingTask;
  organizationId: string;
  onLinkIssued: (link: QuestionnaireLink) => void;
}>) {
  const personId = task.forPatient?.personId ?? "";
  const patientName = formatPersonName(task.forPatient?.person?.name);
  const isQuestionnaire = isQuestionnaireRequestTask(task);
  const status = isQuestionnaire ? questionnaireRequestStatus(task) : null;
  const { selectedOrg } = useOrg();
  const when = whenText(task, selectedOrg?.timezone);

  return (
    <Card className="p-4" data-testid="pending-row">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          {personId ? (
            <Link
              to="/customers/$customerId"
              params={{ customerId: personId }}
              className="truncate font-medium text-foreground hover:underline"
            >
              {patientName}
            </Link>
          ) : (
            <p className="truncate font-medium text-foreground">{patientName}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-foreground/80 text-sm">
              {isQuestionnaire
                ? m.pending_questionnaire({
                    title: task.focusQuestionnaire?.title || m.questionnaire_untitled(),
                  })
                : m.pending_reminder({ description: task.description ?? "" })}
            </p>
            {status ? <QuestionnaireRequestStatusBadge status={status} /> : null}
          </div>
          {when ? <p className="text-muted-foreground text-xs">{when}</p> : null}
        </div>
        <div className="flex shrink-0 justify-end">
          {status ? (
            <QuestionnaireRequestActions
              personId={personId}
              organizationId={organizationId}
              taskId={task.id}
              status={status}
              onLinkIssued={onLinkIssued}
            />
          ) : (
            <MarkDoneButton task={task} personId={personId} organizationId={organizationId} />
          )}
        </div>
      </div>
    </Card>
  );
}

/** Overdue questionnaires, expired links and due reminders across the practitioner's patients. */
export function PendingPage() {
  const { selectedOrg } = useOrg();
  const { data: tasks, isLoading } = usePendingTasks();
  // A resent request usually leaves the list, so the new link lives here, not in its row.
  const [link, setLink] = useState<QuestionnaireLink | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const showLink = (issued: QuestionnaireLink) => {
    setLink(issued);
    setLinkOpen(true);
  };

  function renderContent() {
    if (isLoading) {
      return <Loading />;
    }
    if (!tasks || tasks.length === 0 || !selectedOrg) {
      return (
        <EmptyState
          icon={CircleCheck}
          title={m.pending_empty_title()}
          description={m.pending_empty_desc()}
        />
      );
    }
    return (
      <div className="space-y-3">
        {tasks.map((task) => (
          <PendingRow
            key={task.id}
            task={task}
            organizationId={selectedOrg.id}
            onLinkIssued={showLink}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-7">
      <header className="flex flex-col gap-0.5">
        <h1 className="font-bold text-foreground text-xl uppercase tracking-wide">
          {m.pending_title()}
        </h1>
        <p className="text-muted-foreground text-sm">{m.pending_subtitle()}</p>
      </header>

      {renderContent()}

      <QuestionnaireLinkDialog
        link={link}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        onClosed={() => setLink(null)}
      />
    </div>
  );
}
