import { deleteMedicationRequest } from "@/features/customers/api/medication-requests-api";
import {
  RemoveRecordDialog,
  useResolvedOrganizationId,
} from "@/features/customers/ui/detail/remove-record-dialog";
import * as m from "@/paraglide/messages";
import { personQueryKeys } from "@/shared/utils/query-keys";

interface PrescriptionRemoveDialogProps {
  readonly id: string;
  readonly name: string;
  readonly personId: string;
  readonly organizationId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function PrescriptionRemoveDialog({
  id,
  name,
  personId,
  organizationId,
  open,
  onOpenChange,
}: PrescriptionRemoveDialogProps) {
  const orgId = useResolvedOrganizationId(organizationId);
  return (
    <RemoveRecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.prescription_remove_title({ name })}
      description={m.prescription_remove_desc()}
      confirmLabel={m.common_delete()}
      successMessage={m.prescription_remove_success()}
      invalidateKeys={[personQueryKeys.patientDetailScope(personId)]}
      onConfirm={() => deleteMedicationRequest(id, orgId)}
    />
  );
}
