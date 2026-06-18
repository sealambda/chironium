import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  type AnthropometricSnapshot,
  type AnthropometryFormData,
  logAnthropometry,
} from "@/features/customers/api/anthropometry-api";
import {
  buildAnthropometryFormDefaults,
  hasAdvancedAnthropometryValues,
} from "@/features/customers/ui/detail/anthropometry-form-defaults";
import {
  AnthropometryFormFields,
  hasAnthropometryValues,
  toAnthropometryValuesInput,
} from "@/features/customers/ui/detail/anthropometry-form-fields";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { useOrg } from "@/shared/session/use-org";
import { FormDialog } from "@/shared/ui/form-dialog";

interface AddAnthropometryDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly latestAnthropometry?: AnthropometricSnapshot | null;
  readonly children?: React.ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function AddAnthropometryDialog({
  personId,
  patientId,
  latestAnthropometry = null,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Readonly<AddAnthropometryDialogProps>) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const didResetOnOpen = useRef(false);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: buildAnthropometryFormDefaults(latestAnthropometry),
    onSubmit: async ({ value }) => {
      const input = toAnthropometryValuesInput(value);
      if (!hasAnthropometryValues(input)) {
        return;
      }
      const data: AnthropometryFormData = input;

      if (!patientId) {
        toast.error(m.onboarding_error());
        return;
      }

      setSaving(true);
      try {
        await logAnthropometry(data, patientId, selectedOrg?.id ?? "");
        await invalidatePersonDetail(queryClient, personId);
        toast.success(m.anthropometry_add_success());
        setOpen(false);
        form.reset(buildAnthropometryFormDefaults(latestAnthropometry));
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    if (!open) {
      didResetOnOpen.current = false;
      return;
    }

    if (didResetOnOpen.current) {
      return;
    }

    didResetOnOpen.current = true;
    form.reset(buildAnthropometryFormDefaults(latestAnthropometry));
  }, [form, latestAnthropometry, open]);

  const initialShowMore = hasAdvancedAnthropometryValues(latestAnthropometry);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={children === undefined ? undefined : (children as React.ReactElement)}
      title={m.anthropometry_add()}
      onSubmit={() => form.handleSubmit()}
      saving={saving}
    >
      <AnthropometryFormFields
        key={`${open ? "open" : "closed"}-${initialShowMore ? "advanced" : "basic"}`}
        form={form}
        saving={saving}
        withSteppers
        withValidation
        initialShowMore={initialShowMore}
      />
    </FormDialog>
  );
}
