import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addYears } from "date-fns";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { invalidatePatientTasks } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import {
  type QuestionnaireLink,
  requestQuestionnaire,
} from "@/features/questionnaires/api/questionnaire-requests-api";
import { fetchQuestionnaires } from "@/features/questionnaires/api/questionnaires-api";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { DatePickerString } from "@/shared/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { toDateTimeEnd, todayDateInput } from "@/shared/utils/date-time-input";
import { questionnairesQueryKeys } from "@/shared/utils/query-keys";

import { QuestionnaireLinkResult } from "./questionnaire-link-result";

interface SendQuestionnaireDialogProps {
  personId: string;
  patientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Sends a questionnaire as a single-use link, then shows the link to copy or share. */
export function SendQuestionnaireDialog({
  personId,
  patientId,
  open,
  onOpenChange,
}: Readonly<SendQuestionnaireDialogProps>) {
  const { selectedOrg } = useOrg();
  const orgId = selectedOrg?.id;
  const queryClient = useQueryClient();
  const messageId = useId();

  const [questionnaireId, setQuestionnaireId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [link, setLink] = useState<QuestionnaireLink | null>(null);

  // Reset after the close animation so the link never outlives the dialog.
  const reset = () => {
    setQuestionnaireId("");
    setDueDate("");
    setMessage("");
    setLink(null);
  };

  const { data: questionnaires, isSuccess: questionnairesLoaded } = useQuery({
    queryKey: questionnairesQueryKeys.list(orgId ?? ""),
    queryFn: () => fetchQuestionnaires(orgId ?? ""),
    enabled: open && Boolean(orgId),
  });

  const activeQuestionnaires = useMemo(
    () => (questionnaires ?? []).filter((q) => q.status === "ACTIVE"),
    [questionnaires],
  );

  // `YYYY-MM-DD` strings compare correctly as text.
  const dueDateInPast = dueDate !== "" && dueDate < todayDateInput();
  const canSubmit = Boolean(orgId && patientId && questionnaireId) && !dueDateInPast;

  const handleSubmit = async () => {
    if (!orgId || !patientId || !canSubmit) {
      return;
    }

    setSending(true);
    try {
      const issued = await requestQuestionnaire({
        organizationId: orgId,
        patientId,
        questionnaireId,
        dueAt: toDateTimeEnd(dueDate),
        message,
      });
      setLink(issued);
      await invalidatePatientTasks(queryClient, personId, orgId);
    } catch {
      toast.error(m.questionnaire_request_error());
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          reset();
        }
      }}
    >
      <DialogContent showCloseButton data-testid="send-questionnaire-dialog">
        {link ? (
          <>
            <DialogHeader>
              <DialogTitle>{m.questionnaire_link_title()}</DialogTitle>
              <DialogDescription>{m.questionnaire_link_desc()}</DialogDescription>
            </DialogHeader>

            <QuestionnaireLinkResult link={link} />

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {m.common_close()}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{m.questionnaire_request_title()}</DialogTitle>
              <DialogDescription>{m.questionnaire_request_subtitle()}</DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field>
                <FieldLabel>{m.questionnaire_fill_pick()}</FieldLabel>
                <Select
                  value={questionnaireId}
                  onValueChange={(value) => setQuestionnaireId(value ?? "")}
                  disabled={sending}
                  items={activeQuestionnaires.map((q) => ({
                    value: q.id,
                    label: q.title || m.questionnaire_untitled(),
                  }))}
                >
                  <SelectTrigger className="w-full" data-testid="send-questionnaire-select">
                    <SelectValue placeholder={m.questionnaire_fill_pick_placeholder()} />
                  </SelectTrigger>
                  <SelectPositioner>
                    <SelectContent>
                      {activeQuestionnaires.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.title || m.questionnaire_untitled()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPositioner>
                </Select>
                {questionnairesLoaded && activeQuestionnaires.length === 0 ? (
                  <FieldDescription>{m.questionnaire_request_none_ready()}</FieldDescription>
                ) : null}
              </Field>

              <Field data-invalid={dueDateInPast || undefined}>
                <FieldLabel>{m.questionnaire_request_due_date()}</FieldLabel>
                <DatePickerString
                  value={dueDate}
                  onChange={setDueDate}
                  disabled={sending}
                  startMonth={new Date()}
                  endMonth={addYears(new Date(), 1)}
                />
                {dueDateInPast ? (
                  <FieldError>{m.questionnaire_request_due_date_past()}</FieldError>
                ) : (
                  <FieldDescription>{m.questionnaire_request_due_date_hint()}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor={messageId}>{m.questionnaire_request_message()}</FieldLabel>
                <Textarea
                  id={messageId}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={m.questionnaire_request_message_placeholder()}
                  disabled={sending}
                />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                {m.common_cancel()}
              </Button>
              <Button
                onClick={handleSubmit}
                loading={sending}
                disabled={sending || !canSubmit}
                data-testid="send-questionnaire-submit"
              >
                {m.questionnaire_request_submit()}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
