import { removeNutritionPlan } from "@/features/customers/api/nutrition-plans-api";
import {
  RemoveRecordDialog,
  useResolvedOrganizationId,
} from "@/features/customers/ui/detail/remove-record-dialog";
import * as m from "@/paraglide/messages";
import { personQueryKeys } from "@/shared/utils/query-keys";

interface NutritionRemoveDialogProps {
  readonly id: string;
  readonly personId: string;
  readonly organizationId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function NutritionRemoveDialog({
  id,
  personId,
  organizationId,
  open,
  onOpenChange,
}: NutritionRemoveDialogProps) {
  const orgId = useResolvedOrganizationId(organizationId);
  return (
    <RemoveRecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.nutrition_remove_title()}
      description={m.nutrition_remove_desc()}
      confirmLabel={m.common_delete()}
      successMessage={m.nutrition_remove_success()}
      invalidateKeys={[personQueryKeys.patientDetailScope(personId)]}
      onConfirm={() => removeNutritionPlan(id, orgId)}
    />
  );
}
