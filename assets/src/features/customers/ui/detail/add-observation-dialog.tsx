import { useQueryClient } from "@tanstack/react-query";
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createClinicalNoteObservations } from "@/features/customers/api/observations-api";
import { ObservationDialog } from "@/features/customers/ui/detail/observation-dialog";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { toDateTimeInputParts } from "@/shared/utils/date-time-input";

interface AddObservationDialogProps {
  personId: string;
  patientId: string | null;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function defaultObservationValues() {
  const current = toDateTimeInputParts();

  return {
    body: "",
    effectiveDate: current.date,
    effectiveTime: current.time,
  };
}

export function AddObservationDialog({
  personId,
  patientId,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Readonly<AddObservationDialogProps>) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [effectiveTime, setEffectiveTime] = useState("");
  const didResetOnOpen = useRef(false);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      didResetOnOpen.current = false;
      return;
    }

    if (didResetOnOpen.current) {
      return;
    }

    didResetOnOpen.current = true;
    const defaults = defaultObservationValues();
    setBody(defaults.body);
    setEffectiveDate(defaults.effectiveDate);
    setEffectiveTime(defaults.effectiveTime);
  }, [open]);

  const handleSubmit = async () => {
    if (!body.trim() || !patientId) {
      if (!patientId) {
        toast.error(m.onboarding_error());
      }
      return;
    }

    setSaving(true);
    try {
      await createClinicalNoteObservations(
        [{ body: body.trim(), effectiveDate, effectiveTime }],
        patientId,
        selectedOrg?.id ?? "",
      );
      await invalidatePersonDetail(queryClient, personId);
      toast.success(m.observations_add_success());
      setOpen(false);
      const defaults = defaultObservationValues();
      setBody(defaults.body);
      setEffectiveDate(defaults.effectiveDate);
      setEffectiveTime(defaults.effectiveTime);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <ObservationDialog
      title={m.common_add()}
      submitLabel={m.common_add()}
      open={open}
      onOpenChange={setOpen}
      body={body}
      onBodyChange={setBody}
      effectiveDate={effectiveDate}
      onEffectiveDateChange={setEffectiveDate}
      effectiveTime={effectiveTime}
      onEffectiveTimeChange={setEffectiveTime}
      onSubmit={handleSubmit}
      saving={saving}
      trigger={children as ReactElement}
    />
  );
}
