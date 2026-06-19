import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { createPrescriptionsFromTags } from "@/features/customers/api/medication-requests-api";
import { useTerminologyTagList } from "@/features/customers/hooks/use-terminology-tag-list";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { FieldGroup } from "@/shared/ui/field";
import { FormDialog } from "@/shared/ui/form-dialog";
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";

interface AddPrescriptionsDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly children?: React.ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function AddPrescriptionsDialog({
  personId,
  patientId,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddPrescriptionsDialogProps) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const tags = useTerminologyTagList();
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const canSubmit = tags.tags.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !patientId) {
      if (!patientId) {
        toast.error(m.onboarding_error());
      }
      return;
    }

    setSaving(true);
    try {
      await createPrescriptionsFromTags(tags.tags, patientId, selectedOrg?.id ?? "");

      await invalidatePersonDetail(queryClient, personId);

      toast.success(m.prescription_add_success());
      setOpen(false);
      tags.resetTags();
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={children === undefined ? undefined : (children as React.ReactElement)}
      title={m.prescription_dialog_title()}
      onSubmit={handleSubmit}
      submitDisabled={!canSubmit}
      saving={saving}
    >
      <FieldGroup>
        <TerminologyTagInput
          label={m.prescription_list_label()}
          placeholder={m.prescription_field_placeholder()}
          tags={tags.tags}
          onAdd={tags.addTag}
          onRemove={tags.removeTag}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="MEDICATION"
          addLabel={m.common_add()}
          disabled={saving}
        />
      </FieldGroup>
    </FormDialog>
  );
}
