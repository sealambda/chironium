import type { QuestionnaireLink } from "@/features/questionnaires/api/questionnaire-requests-api";
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

import { QuestionnaireLinkResult } from "./questionnaire-link-result";

interface QuestionnaireLinkDialogProps {
  link: QuestionnaireLink | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the close animation ends, so the caller can drop the link. */
  onClosed?: () => void;
}

/** Shows a new link for an existing request, replacing the one sent before. */
export function QuestionnaireLinkDialog({
  link,
  open,
  onOpenChange,
  onClosed,
}: Readonly<QuestionnaireLinkDialogProps>) {
  return (
    <Dialog
      open={open && link != null}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          onClosed?.();
        }
      }}
    >
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>{m.questionnaire_link_title()}</DialogTitle>
          <DialogDescription>{m.questionnaire_link_desc()}</DialogDescription>
        </DialogHeader>

        {link ? <QuestionnaireLinkResult link={link} replaced /> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {m.common_close()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
