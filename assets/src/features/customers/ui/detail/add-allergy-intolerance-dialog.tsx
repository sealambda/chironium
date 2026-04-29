import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { createAllergiesAndIntolerances } from "@/features/customers/api/allergy-intolerance-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import type { TerminologyTag } from "@/shared/types/terminology";
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
import { personQueryKeys } from "@/shared/utils/query-keys";

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
  const [allergies, setAllergies] = useState<TerminologyTag[]>([]);
  const [intolerances, setIntolerances] = useState<TerminologyTag[]>([]);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const hasContent = allergies.length > 0 || intolerances.length > 0;

  const resetForm = () => {
    setAllergies([]);
    setIntolerances([]);
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
        { allergies, intolerances },
        patientId,
        selectedOrg?.id ?? "",
      );

      await queryClient.invalidateQueries({
        queryKey: personQueryKeys.allergyIntolerancesScope(personId),
      });
      await queryClient.invalidateQueries({
        queryKey: personQueryKeys.patientDetailScope(personId),
      });

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

        <div className="space-y-4">
          <TerminologyTagInput
            label={m.allergy_intolerance_allergies_label()}
            placeholder={m.field_allergies_placeholder()}
            tags={allergies}
            onAdd={(tag) => setAllergies((prev) => [...prev, tag])}
            onRemove={(i) => setAllergies((prev) => prev.filter((_, idx) => idx !== i))}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="ALLERGY_INTOLERANCE"
            addLabel={m.common_add()}
            disabled={saving}
          />
          <TerminologyTagInput
            label={m.allergy_intolerance_intolerances_label()}
            placeholder={m.field_intolerances_placeholder()}
            tags={intolerances}
            onAdd={(tag) => setIntolerances((prev) => [...prev, tag])}
            onRemove={(i) => setIntolerances((prev) => prev.filter((_, idx) => idx !== i))}
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
            {saving ? m.common_saving() : m.allergy_intolerance_dialog_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
