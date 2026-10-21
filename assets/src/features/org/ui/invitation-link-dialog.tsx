import { useQuery } from "@tanstack/react-query";

import { fetchInvitationLink, type InvitationLink } from "@/features/org/api/org-api";
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
import { Loading } from "@/shared/ui/loading";

import { InvitationLinkResult } from "./invitation-link-result";

export interface InvitationLinkTarget {
  invitationId: string;
  email: string;
  /** Only the invited address can accept it: a manager or practitioner invitation. */
  boundToEmail: boolean;
  /** Set after renewing; otherwise the dialog fetches the current link. */
  link?: InvitationLink;
}

interface InvitationLinkDialogProps {
  organizationId: string;
  organizationName: string;
  target: InvitationLinkTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the close animation ends, so the caller can drop the target. */
  onClosed: () => void;
}

/**
 * Shows a pending invitation's link. Fetching inside the dialog keeps the clipboard
 * write a direct result of the Copy click, which Safari requires.
 */
export function InvitationLinkDialog({
  organizationId,
  organizationName,
  target,
  open,
  onOpenChange,
  onClosed,
}: Readonly<InvitationLinkDialogProps>) {
  const invitationId = target?.invitationId ?? "";
  const {
    data: fetchedLink,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["org", "invitation-link", organizationId, invitationId],
    queryFn: () => fetchInvitationLink({ organizationId, invitationId }),
    enabled: open && Boolean(target && !target.link),
    // The link is a credential: don't keep it in the cache after the dialog closes.
    gcTime: 0,
    staleTime: 0,
  });
  const link = target?.link ?? fetchedLink;

  return (
    <Dialog
      open={open && target !== null}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          onClosed();
        }
      }}
    >
      <DialogContent showCloseButton data-testid="invitation-link-dialog">
        <DialogHeader>
          <DialogTitle>{m.settings_invite_link_title()}</DialogTitle>
          <DialogDescription>
            {m.settings_invite_link_desc({ email: target?.email ?? "" })}
          </DialogDescription>
        </DialogHeader>

        {link && target ? (
          <InvitationLinkResult
            link={link}
            email={target.email}
            boundToEmail={target.boundToEmail}
            organizationName={organizationName}
          />
        ) : null}
        {isLoading ? <Loading className="min-h-24" /> : null}
        {isError ? (
          <p className="text-sm text-destructive">{m.settings_invite_link_load_error()}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {m.common_close()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
