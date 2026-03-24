import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { acceptInvitation, fetchCurrentEmailInvitations } from "@/features/org/api/org-api";
import { ORG_QUERY_KEY } from "@/features/org/store/org-store";
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

const INVITATIONS_QUERY_KEY = ["org", "pending-invitations"] as const;
const DISMISSED_INVITES_STORAGE_KEY = "org.dismissed-invitation-ids";

function readDismissedInviteIds(): string[] {
  if (globalThis.window === undefined) {
    return [];
  }

  try {
    const raw = globalThis.window.localStorage.getItem(DISMISSED_INVITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissedInviteIds(inviteIds: string[]): void {
  if (globalThis.window === undefined) {
    return;
  }

  globalThis.window.localStorage.setItem(DISMISSED_INVITES_STORAGE_KEY, JSON.stringify(inviteIds));
}

export function PendingInvitationsDialog() {
  const queryClient = useQueryClient();
  const { refreshOrgs } = useOrg();
  const [dismissedInviteIds, setDismissedInviteIds] = useState<string[]>(() => readDismissedInviteIds());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invitations = [] } = useQuery({
    queryKey: INVITATIONS_QUERY_KEY,
    queryFn: fetchCurrentEmailInvitations,
  });

  const visibleInvitations = useMemo(
    () => invitations.filter((invitation) => !dismissedInviteIds.includes(invitation.id)),
    [dismissedInviteIds, invitations],
  );

  const currentInvitation = visibleInvitations[0] ?? null;

  const handleReject = () => {
    if (!currentInvitation) {
      return;
    }

    const nextIds = [...dismissedInviteIds, currentInvitation.id];
    setDismissedInviteIds(nextIds);
    writeDismissedInviteIds(nextIds);
  };

  const handleAccept = async () => {
    if (!currentInvitation?.inviteCode) {
      toast.error(m.org_invitation_accept_unavailable());
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvitation(currentInvitation.inviteCode);
      toast.success(m.org_invitation_accept_success());

      const nextIds = dismissedInviteIds.filter((id) => id !== currentInvitation.id);
      setDismissedInviteIds(nextIds);
      writeDismissedInviteIds(nextIds);

      await queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY });
      await refreshOrgs();
    } catch (error) {
      const message = error instanceof Error ? error.message : m.org_invitation_accept_error();
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
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
          <Button type="button" variant="ghost" onClick={handleReject} disabled={isSubmitting}>
            {m.org_invitation_reject()}
          </Button>
          <Button type="button" onClick={() => void handleAccept()} disabled={isSubmitting}>
            {isSubmitting ? m.common_saving() : m.org_invitation_accept()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
