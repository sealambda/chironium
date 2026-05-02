import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { createFoodObservations } from "@/features/customers/api/food-preferences-api";
import { useTerminologyTagList } from "@/features/customers/hooks/use-terminology-tag-list";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
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
  const included = useTerminologyTagList();
  const excluded = useTerminologyTagList();
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const hasContent = included.tags.length > 0 || excluded.tags.length > 0;

  const resetForm = () => {
    included.resetTags();
    excluded.resetTags();
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
        { included: included.tags, excluded: excluded.tags },
        patientId,
        selectedOrg?.id ?? "",
        user?.id ?? "",
        user?.name ?? "",
      );

      await invalidatePersonDetail(queryClient, personId);

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

        <div className="flex flex-col gap-4">
          <TerminologyTagInput
            label={m.food_preferences_includes_label()}
            placeholder={m.field_food_included_placeholder()}
            tags={included.tags}
            onAdd={included.addTag}
            onRemove={included.removeTag}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="FOOD"
            addLabel={m.common_add()}
            disabled={saving}
          />
          <TerminologyTagInput
            label={m.food_preferences_avoids_label()}
            placeholder={m.field_food_excluded_placeholder()}
            tags={excluded.tags}
            onAdd={excluded.addTag}
            onRemove={excluded.removeTag}
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
            {saving ? m.common_saving() : m.common_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
