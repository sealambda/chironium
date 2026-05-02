import { deleteObservation } from "@/features/customers/api/observations-api";
import {
  RemoveRecordDialog,
  useResolvedOrganizationId,
} from "@/features/customers/ui/detail/remove-record-dialog";
import * as m from "@/paraglide/messages";
import { personQueryKeys } from "@/shared/utils/query-keys";

interface FoodPreferenceRemoveDialogProps {
  readonly id: string;
  readonly name: string;
  readonly personId: string;
  readonly organizationId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function FoodPreferenceRemoveDialog({
  id,
  name,
  personId,
  organizationId,
  open,
  onOpenChange,
}: FoodPreferenceRemoveDialogProps) {
  const orgId = useResolvedOrganizationId(organizationId);
  return (
    <RemoveRecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.food_preferences_remove_title({ name })}
      description={m.food_preferences_remove_desc()}
      confirmLabel={m.common_remove()}
      successMessage={m.food_preferences_remove_success()}
      invalidateKeys={[personQueryKeys.patientDetailScope(personId)]}
      onConfirm={() => deleteObservation(id, orgId)}
    />
  );
}
