import { useQueryClient } from "@tanstack/react-query";
import { type ReactElement, type ReactNode, useState } from "react";
import { toast } from "sonner";

import { createClinicalNoteObservations } from "@/features/customers/api/observations-api";
import { ObservationDialog } from "@/features/customers/ui/detail/observation-dialog";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";

interface AddObservationDialogProps {
  personId: string;
  patientId: string | null;
  children: ReactNode;
}

export function AddObservationDialog({
  personId,
  patientId,
  children,
}: Readonly<AddObservationDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [effectiveTime, setEffectiveTime] = useState("");
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

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
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["person", personId, "observations"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["person", personId, "observationsList"],
        }),
      ]);
      toast.success(m.observations_add_success());
      setOpen(false);
      setBody("");
      setEffectiveDate("");
      setEffectiveTime("");
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <ObservationDialog
      title={m.observations_add()}
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
