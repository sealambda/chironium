import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  acceptInvitation,
  fetchCurrentEmailInvitations,
  rejectInvitation,
} from "@/features/org/api/org-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { ORG_QUERY_KEY } from "@/features/org/store/org-store";
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

const INVITATIONS_QUERY_KEY = ["org", "pending-invitations"] as const;

type InvitationSubmitAction = "accept" | "reject";

export function PendingInvitationsDialog() {
  const queryClient = useQueryClient();
  const { refreshOrgs } = useOrg();
  const [submittingAction, setSubmittingAction] = useState<InvitationSubmitAction | null>(null);

  const { data: invitations = [] } = useQuery({
    queryKey: INVITATIONS_QUERY_KEY,
    queryFn: fetchCurrentEmailInvitations,
  });

  const currentInvitation = useMemo(() => invitations[0] ?? null, [invitations]);

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

      await queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY });
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
    const inviteCode = currentInvitation?.inviteCode;
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
    const inviteCode = currentInvitation?.inviteCode;
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
    <Dialog open={Boolean(currentInvitation)} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{m.org_invitation_dialog_title()}</DialogTitle>
          <DialogDescription>
            {currentInvitation ? m.org_invitation_dialog_desc() : ""}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleReject()}
            disabled={submittingAction !== null}
          >
            {submittingAction === "reject" ? m.common_saving() : m.org_invitation_reject()}
          </Button>
          <Button
            type="button"
            onClick={() => void handleAccept()}
            disabled={submittingAction !== null}
          >
            {submittingAction === "accept" ? m.common_saving() : m.org_invitation_accept()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
