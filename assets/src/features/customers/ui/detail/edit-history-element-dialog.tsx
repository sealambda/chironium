import { useEffect, useState } from "react";

import type { ConceptSearchContext } from "@/features/customers/api/terminology-api";
import * as m from "@/paraglide/messages";
import type { TerminologyTag } from "@/shared/types/terminology";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { TerminologySingleTagInput } from "@/shared/ui/terminology-single-tag-input";

interface EditHistoryElementDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly conceptContext: ConceptSearchContext;
  readonly initialTag: TerminologyTag | null;
  readonly saving?: boolean;
  readonly onSave: (tag: TerminologyTag) => void | Promise<void>;
}

export function EditHistoryElementDialog({
  open,
  onOpenChange,
  organizationId,
  conceptContext,
  initialTag,
  saving = false,
  onSave,
}: EditHistoryElementDialogProps) {
  const [tag, setTag] = useState<TerminologyTag | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open && initialTag) {
      setTag(initialTag);
    }
    if (!open) {
      setTag(null);
      setPending(false);
    }
  }, [open, initialTag]);

  const canSave = tag !== null && !pending && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.history_edit_element_title()}</DialogTitle>
        </DialogHeader>
        <TerminologySingleTagInput
          label=""
          showFieldLabel={false}
          placeholder={m.history_edit_element_placeholder()}
          tag={saving ? null : tag}
          onTagChange={setTag}
          organizationId={organizationId}
          conceptContext={conceptContext}
          disabled={saving}
          onPendingChange={setPending}
        />
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {m.common_cancel()}
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (tag) {
                void onSave(tag);
              }
            }}
            disabled={!canSave}
          >
            {saving ? m.common_saving() : m.common_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
