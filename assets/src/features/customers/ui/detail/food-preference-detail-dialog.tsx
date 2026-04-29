import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/shared/ui/field";

interface FoodPreferenceDetailDialogProps {
  readonly item: FoodPreferenceHistoryItem | null;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onRemoveClick?: () => void;
}

function authorLabel(item: FoodPreferenceHistoryItem): string | null {
  const note = item.notes[0];
  if (!note) {
    return null;
  }
  return note.authorString?.trim() || note.authorReference?.trim() || null;
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
  const userPicked = authorLabel(item);
  const kindLabel =
    item.type === "inclusion"
      ? m.food_preferences_kind_inclusion()
      : m.food_preferences_kind_exclusion();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.food_preferences_detail_title()}</DialogTitle>
          <DialogDescription>{m.food_preferences_detail_desc()}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
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

          {userPicked ? (
            <Field>
              <FieldLabel>{m.food_preferences_field_user_picked()}</FieldLabel>
              <FieldDescription>{userPicked}</FieldDescription>
            </Field>
          ) : null}
        </FieldGroup>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {onRemoveClick ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={onRemoveClick}
              type="button"
            >
              {m.food_preferences_remove_btn()}
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} type="button">
              {m.common_close()}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
