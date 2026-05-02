import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { createAllergiesAndIntolerances } from "@/features/customers/api/allergy-intolerance-api";
import { useTerminologyTagList } from "@/features/customers/hooks/use-terminology-tag-list";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";

interface AddAllergyIntoleranceDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly children?: React.ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function AddAllergyIntoleranceDialog({
  personId,
  patientId,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddAllergyIntoleranceDialogProps) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const allergies = useTerminologyTagList();
  const intolerances = useTerminologyTagList();
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const hasContent = allergies.tags.length > 0 || intolerances.tags.length > 0;

  const resetForm = () => {
    allergies.resetTags();
    intolerances.resetTags();
  };

  const handleSubmit = async () => {
    if (!hasContent || !patientId) {
      if (!patientId) {
        toast.error(m.onboarding_error());
      }
      return;
    }

    setSaving(true);
    try {
      await createAllergiesAndIntolerances(
        { allergies: allergies.tags, intolerances: intolerances.tags },
        patientId,
        selectedOrg?.id ?? "",
      );

      await invalidatePersonDetail(queryClient, personId);

      toast.success(m.allergy_intolerance_add_success());
      setOpen(false);
      resetForm();
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children !== undefined && <DialogTrigger render={children as React.ReactElement} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.allergy_intolerance_dialog_title()}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <TerminologyTagInput
            label={m.allergy_intolerance_allergies_label()}
            placeholder={m.field_allergies_placeholder()}
            tags={allergies.tags}
            onAdd={allergies.addTag}
            onRemove={allergies.removeTag}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="ALLERGY_INTOLERANCE"
            addLabel={m.common_add()}
            disabled={saving}
          />
          <TerminologyTagInput
            label={m.allergy_intolerance_intolerances_label()}
            placeholder={m.field_intolerances_placeholder()}
            tags={intolerances.tags}
            onAdd={intolerances.addTag}
            onRemove={intolerances.removeTag}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="ALLERGY_INTOLERANCE"
            addLabel={m.common_add()}
            disabled={saving}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || !hasContent}>
            {saving ? m.common_saving() : m.common_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
