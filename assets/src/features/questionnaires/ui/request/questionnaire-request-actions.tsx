import { useQueryClient } from "@tanstack/react-query";
import { Ban, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { invalidatePatientTasks } from "@/features/customers/utils/person-detail-cache";
import {
  type QuestionnaireLink,
  reissueQuestionnaireLink,
} from "@/features/questionnaires/api/questionnaire-requests-api";
import type { QuestionnaireRequestStatus } from "@/features/questionnaires/model/questionnaire-request-status";
import { QuestionnaireLinkDialog } from "@/features/questionnaires/ui/request/questionnaire-link-dialog";
import { cancelTask } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

interface QuestionnaireRequestActionsProps {
  personId: string;
  organizationId: string;
  taskId: string;
  status: QuestionnaireRequestStatus;
  /**
   * Shows the new link instead of this component's own dialog. Needed where the
   * resend can remove the row, as on the Pending page, since the dialog unmounts with it.
   */
  onLinkIssued?: (link: QuestionnaireLink) => void;
}

/** Resend and Cancel for an open questionnaire request, each behind a confirmation. */
export function QuestionnaireRequestActions({
  personId,
  organizationId,
  taskId,
  status,
  onLinkIssued,
}: Readonly<QuestionnaireRequestActionsProps>) {
  const queryClient = useQueryClient();
  // The kind outlives `confirmOpen` so the dialog keeps its text while it animates out.
  const [confirmKind, setConfirmKind] = useState<"resend" | "cancel">("resend");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<QuestionnaireLink | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const openConfirm = (kind: "resend" | "cancel") => {
    setConfirmKind(kind);
    setConfirmOpen(true);
  };

  const handleConfirmOpenChange = (open: boolean) => {
    if (!busy) {
      setConfirmOpen(open);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      const issued = await reissueQuestionnaireLink(taskId, organizationId);
      setConfirmOpen(false);
      if (onLinkIssued) {
        onLinkIssued(issued);
      } else {
        setLink(issued);
        setLinkOpen(true);
      }
      await invalidatePatientTasks(queryClient, personId, organizationId);
    } catch {
      toast.error(m.questionnaire_request_resend_error());
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelTask(taskId, organizationId);
      setConfirmOpen(false);
      await invalidatePatientTasks(queryClient, personId, organizationId);
      toast.success(m.questionnaire_request_cancelled());
    } catch {
      toast.error(m.questionnaire_request_cancel_error());
    } finally {
      setBusy(false);
    }
  };

  // Reissuing ends the patient's session, so answers in progress are lost.
  const resendDescription =
    status === "opened"
      ? m.questionnaire_request_resend_confirm_desc_opened()
      : m.questionnaire_request_resend_confirm_desc();

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-muted-foreground hover:text-foreground"
        aria-label={m.questionnaire_request_resend()}
        title={m.questionnaire_request_resend()}
        onClick={() => openConfirm("resend")}
      >
        <RefreshCw aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-muted-foreground hover:text-destructive"
        aria-label={m.questionnaire_request_cancel()}
        title={m.questionnaire_request_cancel()}
        onClick={() => openConfirm("cancel")}
      >
        <Ban aria-hidden />
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          {confirmKind === "cancel" ? (
            <AlertDialogHeader>
              <AlertDialogTitle>{m.questionnaire_request_cancel_confirm_title()}</AlertDialogTitle>
              <AlertDialogDescription>
                {m.questionnaire_request_cancel_confirm_desc()}
              </AlertDialogDescription>
            </AlertDialogHeader>
          ) : (
            <AlertDialogHeader>
              <AlertDialogTitle>{m.questionnaire_request_resend_confirm_title()}</AlertDialogTitle>
              <AlertDialogDescription>{resendDescription}</AlertDialogDescription>
            </AlertDialogHeader>
          )}
          {confirmKind === "cancel" ? (
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>
                {m.questionnaire_request_keep()}
              </AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={cancel} loading={busy}>
                {m.questionnaire_request_cancel()}
              </AlertDialogAction>
            </AlertDialogFooter>
          ) : (
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>{m.common_cancel()}</AlertDialogCancel>
              <AlertDialogAction onClick={resend} loading={busy}>
                {m.questionnaire_request_resend_confirm()}
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <QuestionnaireLinkDialog
        link={link}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        onClosed={() => setLink(null)}
      />
    </div>
  );
}
