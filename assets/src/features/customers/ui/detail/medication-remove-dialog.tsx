import { deleteMedicationStatement } from "@/features/customers/api/medications-api";
import {
  RemoveRecordDialog,
  useResolvedOrganizationId,
} from "@/features/customers/ui/detail/remove-record-dialog";
import * as m from "@/paraglide/messages";
import { personQueryKeys } from "@/shared/utils/query-keys";

interface MedicationRemoveDialogProps {
  readonly id: string;
  readonly name: string;
  readonly personId: string;
  readonly organizationId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function MedicationRemoveDialog({
  id,
  name,
  personId,
  organizationId,
  open,
  onOpenChange,
}: MedicationRemoveDialogProps) {
  const orgId = useResolvedOrganizationId(organizationId);
  return (
    <RemoveRecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.medication_remove_title({ name })}
      description={m.medication_remove_desc()}
      confirmLabel={m.common_delete()}
      successMessage={m.medication_remove_success()}
      invalidateKeys={[personQueryKeys.patientDetailScope(personId)]}
      onConfirm={() => deleteMedicationStatement(id, orgId)}
    />
  );
}
