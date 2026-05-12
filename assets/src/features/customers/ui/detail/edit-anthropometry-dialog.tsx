import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type AnthropometricSnapshot,
  type AnthropometryUpdateInput,
  deleteAnthropometryEntry,
  updateAnthropometryEntry,
} from "@/features/customers/api/anthropometry-api";
import {
  AnthropometryFormFields,
  type AnthropometryFormValues,
  hasAnthropometryValues,
  toAnthropometryValuesInput,
} from "@/features/customers/ui/detail/anthropometry-form-fields";
import { DeleteHistoryEntryDialog } from "@/features/customers/ui/detail/delete-history-entry-dialog";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { FormDialog } from "@/shared/ui/form-dialog";
import { isoToDateTimeInputParts } from "@/shared/utils/date-time-input";

interface EditAnthropometryDialogProps {
  personId: string;
  patientId: string | null;
  snapshot: AnthropometricSnapshot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAnthropometryDialog({
  personId,
  patientId,
  snapshot,
  open,
  onOpenChange,
}: Readonly<EditAnthropometryDialogProps>) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        await updateAnthropometryEntry(
          snapshot,
          updateInput,
          patientId ?? "",
          selectedOrg?.id ?? "",
        );
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
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={m.anthropometry_edit_title()}
        onDelete={() => setDeleteOpen(true)}
        onSubmit={() => form.handleSubmit()}
        saving={saving}
      >
        <AnthropometryFormFields
          form={form}
          saving={saving}
          withSteppers={false}
          withValidation={false}
          disableEffectiveDateTime
          initialShowMore={Boolean(
            snapshot.chest || snapshot.waist || snapshot.hip || snapshot.arm || snapshot.thigh,
          )}
        />
      </FormDialog>

      <DeleteHistoryEntryDialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteOpen(false);
          }
        }}
        deleting={deleting}
        onConfirm={async () => {
          const orgId = selectedOrg?.id ?? "";
          setDeleting(true);
          try {
            await deleteAnthropometryEntry(snapshot, orgId);
            await invalidatePersonDetail(queryClient, personId);
            toast.success(m.anthropometry_delete_success());
            setDeleteOpen(false);
            onOpenChange(false);
          } catch {
            toast.error(m.onboarding_error());
          } finally {
            setDeleting(false);
          }
        }}
      />
    </>
  );
}
