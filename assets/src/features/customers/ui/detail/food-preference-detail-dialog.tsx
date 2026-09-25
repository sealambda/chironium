import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import { SelfReportedBadge } from "@/features/customers/ui/detail/self-reported-badge";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormDialog } from "@/shared/ui/form-dialog";

interface FoodPreferenceDetailDialogProps {
  readonly item: FoodPreferenceHistoryItem | null;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onRemoveClick?: () => void;
}

export function FoodPreferenceDetailDialog({
  item,
  open: openProp,
  onOpenChange,
  onRemoveClick,
}: FoodPreferenceDetailDialogProps) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: false,
    onChange: onOpenChange,
  });

  if (!item) {
    return null;
  }

  const coding = item.codings[0] ?? null;
  const name = item.items?.trim() || coding?.display?.trim() || coding?.code || "";
  const kindLabel =
    item.type === "inclusion"
      ? m.food_preferences_kind_inclusion()
      : m.food_preferences_kind_exclusion();

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={m.food_preferences_detail_title()}
      description={m.food_preferences_detail_desc()}
      contentClassName="sm:max-w-md"
      onDelete={onRemoveClick}
    >
      <FieldGroup>
        {item.selfReported ? <SelfReportedBadge /> : null}
        <Field>
          <FieldLabel>{m.food_preferences_field_name()}</FieldLabel>
          <FieldDescription>{name}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>{m.food_preferences_field_kind()}</FieldLabel>
          <FieldDescription>{kindLabel}</FieldDescription>
        </Field>

        {coding ? (
          <>
            <Field>
              <FieldLabel>{m.food_preferences_field_code()}</FieldLabel>
              <FieldDescription>{coding.code}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>{m.food_preferences_field_coding_system()}</FieldLabel>
              <FieldDescription className="break-all">{coding.system}</FieldDescription>
            </Field>
          </>
        ) : null}
      </FieldGroup>
    </FormDialog>
  );
}
