import { useQueryClient } from "@tanstack/react-query";
import { isValid, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  type ObservationItem,
  updateClinicalNoteObservation,
} from "@/features/customers/api/observations-api";
import { ObservationDialog } from "@/features/customers/ui/detail/observation-dialog";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { toDateInput, toTimeInput } from "@/shared/utils/date-time-input";
import { personQueryKeys } from "@/shared/utils/query-keys";

interface EditObservationDialogProps {
  observation: ObservationItem;
  personId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditObservationDialog({
  observation,
  personId,
  open,
  onOpenChange,
}: Readonly<EditObservationDialogProps>) {
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [effectiveTime, setEffectiveTime] = useState("");
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  // Reset form to the observation's raw markdown each time the dialog opens.
  useEffect(() => {
    if (open) {
      setBody(observation.valueString ?? "");
      const parsedDateTime = observation.effectiveDateTime
        ? parseISO(observation.effectiveDateTime)
        : null;
      if (parsedDateTime && isValid(parsedDateTime)) {
        setEffectiveDate(toDateInput(parsedDateTime));
        setEffectiveTime(toTimeInput(parsedDateTime));
      } else {
        setEffectiveDate("");
        setEffectiveTime("");
      }
    }
  }, [open, observation]);

  const handleSubmit = async () => {
    if (!body.trim()) {
      return;
    }

    setSaving(true);
    try {
      await updateClinicalNoteObservation(
        observation.id,
        { body: body.trim(), effectiveDate, effectiveTime },
        selectedOrg?.id ?? "",
      );
      await queryClient.invalidateQueries({
        queryKey: personQueryKeys.observationsListScope(personId),
      });
      toast.success(m.observations_edit_success());
      onOpenChange(false);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <ObservationDialog
      title={m.observations_edit_title()}
      submitLabel={m.common_save()}
      open={open}
      onOpenChange={onOpenChange}
      body={body}
      onBodyChange={setBody}
      effectiveDate={effectiveDate}
      onEffectiveDateChange={setEffectiveDate}
      effectiveTime={effectiveTime}
      onEffectiveTimeChange={setEffectiveTime}
      onSubmit={handleSubmit}
      saving={saving}
    />
  );
}
