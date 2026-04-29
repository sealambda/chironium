import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  type AnthropometryFormData,
  logAnthropometry,
} from "@/features/customers/api/anthropometry-api";
import {
  AnthropometryFormFields,
  type AnthropometryFormValues,
  hasAnthropometryValues,
  toAnthropometryValuesInput,
} from "@/features/customers/ui/detail/anthropometry-form-fields";
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
import { personQueryKeys } from "@/shared/utils/query-keys";

interface AddAnthropometryDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly children?: React.ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

const EMPTY_VALUES: AnthropometryFormValues = {
  effectiveDateTime: "",
  effectiveTime: "",
  weightKg: "",
  heightCm: "",
  chestCm: "",
  waistCm: "",
  hipCm: "",
  armCm: "",
  thighCm: "",
};

export function AddAnthropometryDialog({
  personId,
  patientId,
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
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: EMPTY_VALUES,
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
        await queryClient.invalidateQueries({
          queryKey: personQueryKeys.anthropometryHistoryScope(personId),
        });
        toast.success(m.anthropometry_add_success());
        setOpen(false);
        form.reset();
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children !== undefined && <DialogTrigger render={children as React.ReactElement} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.anthropometry_add()}</DialogTitle>
        </DialogHeader>

        <AnthropometryFormFields
          form={form}
          saving={saving}
          withSteppers
          withValidation
          initialShowMore={false}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => form.handleSubmit()} loading={saving}>
            {saving ? m.common_saving() : m.common_add()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
