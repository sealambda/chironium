import { removeCondition } from "@/features/customers/api/condition-api";
import {
  type RemoveReasonOption,
  RemoveRecordDialog,
  useResolvedOrganizationId,
} from "@/features/customers/ui/detail/remove-record-dialog";
import * as m from "@/paraglide/messages";
import { personQueryKeys } from "@/shared/utils/query-keys";

interface ConditionRemoveDialogProps {
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
    label: m.condition_remove_reason_error(),
    description: m.condition_remove_reason_error_desc(),
  },
  {
    value: "REFUTED",
    label: m.condition_remove_reason_refuted(),
    description: m.condition_remove_reason_refuted_desc(),
  },
];

export function ConditionRemoveDialog({
  id,
  name,
  personId,
  organizationId,
  open,
  onOpenChange,
}: ConditionRemoveDialogProps) {
  const orgId = useResolvedOrganizationId(organizationId);
  return (
    <RemoveRecordDialog<RemoveReason>
      open={open}
      onOpenChange={onOpenChange}
      title={m.condition_remove_title({ name })}
      description={m.condition_remove_desc()}
      confirmLabel={m.condition_remove_confirm()}
      successMessage={m.condition_remove_success()}
      reasonOptions={reasonOptions()}
      invalidateKeys={[personQueryKeys.conditionsScope(personId)]}
      onConfirm={(reason) => removeCondition(id, reason ?? "ENTERED_IN_ERROR", orgId)}
    />
  );
}
