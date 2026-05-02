import { removeAllergyIntolerance } from "@/features/customers/api/allergy-intolerance-api";
import {
  type RemoveReasonOption,
  RemoveRecordDialog,
  useResolvedOrganizationId,
} from "@/features/customers/ui/detail/remove-record-dialog";
import * as m from "@/paraglide/messages";
import { personQueryKeys } from "@/shared/utils/query-keys";

interface AllergyRemoveDialogProps {
  readonly id: string;
  readonly name: string;
  readonly personId: string;
  readonly organizationId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

type RemoveReason = "ENTERED_IN_ERROR" | "REFUTED";

const reasonOptions = (): readonly RemoveReasonOption<RemoveReason>[] => [
  {
    value: "ENTERED_IN_ERROR",
    label: m.allergy_intolerance_remove_reason_error(),
    description: m.allergy_intolerance_remove_reason_error_desc(),
  },
  {
    value: "REFUTED",
    label: m.allergy_intolerance_remove_reason_refuted(),
    description: m.allergy_intolerance_remove_reason_refuted_desc(),
  },
];

export function AllergyRemoveDialog({
  id,
  name,
  personId,
  organizationId,
  open,
  onOpenChange,
}: AllergyRemoveDialogProps) {
  const orgId = useResolvedOrganizationId(organizationId);
  return (
    <RemoveRecordDialog<RemoveReason>
      open={open}
      onOpenChange={onOpenChange}
      title={m.allergy_intolerance_remove_title({ name })}
      description={m.allergy_intolerance_remove_desc()}
      confirmLabel={m.allergy_intolerance_remove_confirm()}
      successMessage={m.allergy_intolerance_remove_success()}
      reasonOptions={reasonOptions()}
      invalidateKeys={[personQueryKeys.patientDetailScope(personId)]}
      onConfirm={(reason) => removeAllergyIntolerance(id, reason ?? "ENTERED_IN_ERROR", orgId)}
    />
  );
}
