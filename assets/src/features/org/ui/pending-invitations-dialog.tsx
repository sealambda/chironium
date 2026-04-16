import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { acceptInvitation, rejectInvitation } from "@/features/org/api/org-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { ORG_QUERY_KEY } from "@/shared/utils/query-keys";

type InvitationSubmitAction = "accept" | "reject";

export function PendingInvitationsDialog() {
  const queryClient = useQueryClient();
  const { refreshOrgs } = useOrg();
  const [submittingAction, setSubmittingAction] = useState<InvitationSubmitAction | null>(null);

  const inviteCode = readInviteCodeFromUrl();

  const clearInviteCodeFromUrl = () => {
    const current = new URL(globalThis.location.href);
    current.searchParams.delete("invite_code");

    const updatedUrl = `${current.pathname}${current.search}${current.hash}`;
    globalThis.history.replaceState(globalThis.history.state, "", updatedUrl);
  };

  const submitInvitationAction = async (params: {
    action: InvitationSubmitAction;
    inviteCode: string;
    mutate: (inviteCode: string) => Promise<void>;
    successMessage: string;
    errorFallbackMessage: string;
  }) => {
    setSubmittingAction(params.action);
    try {
      await params.mutate(params.inviteCode);
      toast.success(params.successMessage);

      clearInviteCodeFromUrl();
      await queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY });
      await refreshOrgs();
    } catch (error) {
      const message = error instanceof Error ? error.message : params.errorFallbackMessage;
      toast.error(message);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleReject = async () => {
    if (!inviteCode) {
      toast.error(m.org_invitation_reject_unavailable());
      return;
    }

    await submitInvitationAction({
      action: "reject",
      inviteCode,
      mutate: rejectInvitation,
      successMessage: m.org_invitation_reject_success(),
      errorFallbackMessage: m.org_invitation_reject_error(),
    });
  };

  const handleAccept = async () => {
    if (!inviteCode) {
      toast.error(m.org_invitation_accept_unavailable());
      return;
    }

    await submitInvitationAction({
      action: "accept",
      inviteCode,
      mutate: acceptInvitation,
      successMessage: m.org_invitation_accept_success(),
      errorFallbackMessage: m.org_invitation_accept_error(),
    });
  };

  return (
    <Dialog open={Boolean(inviteCode)} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{m.org_invitation_dialog_title()}</DialogTitle>
          <DialogDescription>
            {inviteCode ? m.org_invitation_dialog_desc({ inviteCode }) : ""}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleReject()}
            disabled={submittingAction !== null}
            data-testid="invitation-reject-button"
          >
            {submittingAction === "reject" ? m.common_saving() : m.org_invitation_reject()}
          </Button>
          <Button
            type="button"
            onClick={() => void handleAccept()}
            disabled={submittingAction !== null}
            data-testid="invitation-accept-button"
          >
            {submittingAction === "accept" ? m.common_saving() : m.org_invitation_accept()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function readInviteCodeFromUrl(): string | null {
  const code = new URLSearchParams(globalThis.location.search).get("invite_code");
  if (!code) {
    return null;
  }

  const trimmed = code.trim();
  return trimmed.length > 0 ? trimmed : null;
}
