import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { createFoodObservations } from "@/features/customers/api/food-preferences-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
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

interface AddFoodPreferenceDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly children?: React.ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function AddFoodPreferenceDialog({
  personId,
  patientId,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddFoodPreferenceDialogProps) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const [included, setIncluded] = useState<TerminologyTag[]>([]);
  const [excluded, setExcluded] = useState<TerminologyTag[]>([]);
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const hasContent = included.length > 0 || excluded.length > 0;

  const resetForm = () => {
    setIncluded([]);
    setExcluded([]);
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
      await createFoodObservations(
        { included, excluded },
        patientId,
        selectedOrg?.id ?? "",
        user?.id ?? "",
        user?.name ?? "",
      );

      await queryClient.invalidateQueries({
        queryKey: personQueryKeys.foodPreferencesHistoryScope(personId),
      });

      toast.success(m.food_preferences_add_success());
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
          <DialogTitle>{m.food_preferences_dialog_title()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <TerminologyTagInput
            label={m.food_preferences_includes_label()}
            placeholder={m.field_food_included_placeholder()}
            tags={included}
            onAdd={(tag) => setIncluded((prev) => [...prev, tag])}
            onRemove={(i) => setIncluded((prev) => prev.filter((_, idx) => idx !== i))}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="FOOD"
            addLabel={m.common_add()}
            disabled={saving}
          />
          <TerminologyTagInput
            label={m.food_preferences_avoids_label()}
            placeholder={m.field_food_excluded_placeholder()}
            tags={excluded}
            onAdd={(tag) => setExcluded((prev) => [...prev, tag])}
            onRemove={(i) => setExcluded((prev) => prev.filter((_, idx) => idx !== i))}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="FOOD"
            addLabel={m.common_add()}
            disabled={saving}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || !hasContent}>
            {saving ? m.common_saving() : m.food_preferences_dialog_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
