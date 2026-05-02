import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type AnthropometricSnapshot,
  type AnthropometryUpdateInput,
  updateAnthropometryEntry,
} from "@/features/customers/api/anthropometry-api";
import {
  AnthropometryFormFields,
  type AnthropometryFormValues,
  hasAnthropometryValues,
  toAnthropometryValuesInput,
} from "@/features/customers/ui/detail/anthropometry-form-fields";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { isoToDateTimeInputParts } from "@/shared/utils/date-time-input";

interface EditAnthropometryDialogProps {
  personId: string;
  snapshot: AnthropometricSnapshot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAnthropometryDialog({
  personId,
  snapshot,
  open,
  onOpenChange,
}: EditAnthropometryDialogProps) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const defaults = useMemo(() => isoToDateTimeInputParts(snapshot.date), [snapshot.date]);
  const initialValues = useMemo<AnthropometryFormValues>(
    () => ({
      effectiveDateTime: defaults.date,
      effectiveTime: defaults.time,
      weightKg: snapshot.weight?.toString() ?? "",
      heightCm: snapshot.height?.toString() ?? "",
      chestCm: snapshot.chest?.toString() ?? "",
      waistCm: snapshot.waist?.toString() ?? "",
      hipCm: snapshot.hip?.toString() ?? "",
      armCm: snapshot.arm?.toString() ?? "",
      thighCm: snapshot.thigh?.toString() ?? "",
    }),
    [
      defaults.date,
      defaults.time,
      snapshot.arm,
      snapshot.chest,
      snapshot.height,
      snapshot.hip,
      snapshot.thigh,
      snapshot.waist,
      snapshot.weight,
    ],
  );

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const input = toAnthropometryValuesInput(value);
      if (!hasAnthropometryValues(input)) {
        return;
      }
      const updateInput: AnthropometryUpdateInput = input;

      setSaving(true);
      try {
        await updateAnthropometryEntry(snapshot, updateInput, selectedOrg?.id ?? "");
        await invalidatePersonDetail(queryClient, personId);
        toast.success(m.anthropometry_edit_success());
        onOpenChange(false);
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.anthropometry_edit_title()}</DialogTitle>
        </DialogHeader>

        <AnthropometryFormFields
          form={form}
          saving={saving}
          withSteppers={false}
          withValidation={false}
          initialShowMore={Boolean(
            snapshot.chest || snapshot.waist || snapshot.hip || snapshot.arm || snapshot.thigh,
          )}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => form.handleSubmit()} disabled={saving}>
            {saving ? m.common_saving() : m.common_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
