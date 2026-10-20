import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { acceptInvitation, rejectInvitation } from "@/features/org/api/org-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { MutationError } from "@/shared/api/error-utils";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { ORG_QUERY_KEY } from "@/shared/utils/query-keys";

type InvitationSubmitAction = "accept" | "reject";

// Server error text is English, so only known fields get a specific message.
function invitationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof MutationError) {
    if (error.fields.includes("expires_at")) {
      return m.org_invitation_expired();
    }
    if (error.fields.includes("email")) {
      return m.org_invitation_wrong_account();
    }
  }
  return fallback;
}

interface PendingInvitationsDialogProps {
  open?: boolean;
  initialInviteCode?: string;
  onOpenChange?: (open: boolean) => void;
}

export function PendingInvitationsDialog({
  open = false,
  initialInviteCode = "",
  onOpenChange,
}: Readonly<PendingInvitationsDialogProps>) {
  const queryClient = useQueryClient();
  const { refreshOrgs, selectOrg } = useOrg();
  const [submittingAction, setSubmittingAction] = useState<InvitationSubmitAction | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState(initialInviteCode);

  useEffect(() => {
    setInviteCodeInput(initialInviteCode);
  }, [initialInviteCode]);

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

      await queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY });
      await refreshOrgs();
      onOpenChange?.(false);
      setInviteCodeInput("");
    } catch (error) {
      toast.error(invitationErrorMessage(error, params.errorFallbackMessage));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleReject = async () => {
    const inviteCode = inviteCodeInput.trim();
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
    const inviteCode = inviteCodeInput.trim();
    if (!inviteCode) {
      toast.error(m.org_invitation_code_required());
      return;
    }

    setSubmittingAction("accept");
    try {
      const organizationId = await acceptInvitation(inviteCode);
      toast.success(m.org_invitation_accept_success());

      await queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY });
      await refreshOrgs();
      await selectOrg(organizationId);
      onOpenChange?.(false);
      setInviteCodeInput("");
    } catch (error) {
      toast.error(invitationErrorMessage(error, m.org_invitation_accept_error()));
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.org_invitation_dialog_title()}</DialogTitle>
          <DialogDescription>{m.org_invitation_dialog_desc()}</DialogDescription>
        </DialogHeader>

        <Input
          id="invitation-code"
          value={inviteCodeInput}
          onChange={(event) => setInviteCodeInput(event.target.value)}
          placeholder={m.org_invitation_code_placeholder()}
          data-testid="invitation-code-input"
        />

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
