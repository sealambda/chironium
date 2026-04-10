import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createGoal, type GoalRecord, updateGoal } from "@/features/customers/api/goals-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import type { GoalCategory, GoalPriority } from "@/gql/graphql";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { DatePickerString } from "@/shared/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { personQueryKeys } from "@/shared/utils/query-keys";

// ─── Constants ────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "HIGH_PRIORITY", label: () => m.goals_priority_high() },
  { value: "MEDIUM_PRIORITY", label: () => m.goals_priority_medium() },
  { value: "LOW_PRIORITY", label: () => m.goals_priority_low() },
] as const;

const CATEGORY_OPTIONS = [
  { value: "DIETARY", label: () => m.goals_category_dietary() },
  { value: "BEHAVIORAL", label: () => m.goals_category_behavioral() },
  { value: "NURSING", label: () => m.goals_category_nursing() },
  { value: "PHYSIOTHERAPY", label: () => m.goals_category_physiotherapy() },
  { value: "SAFETY", label: () => m.goals_category_safety() },
] as const;

// ─── Props ────────────────────────────────────────────────────────────

interface AddGoalDialogProps {
  personId: string;
  patientId: string | null;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editGoal?: GoalRecord | null;
}

// ─── Component ────────────────────────────────────────────────────────

export function AddGoalDialog({
  personId,
  patientId,
  children,
  open,
  onOpenChange,
  editGoal,
}: Readonly<AddGoalDialogProps>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const isEditing = Boolean(editGoal);
  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : internalOpen;
  let submitLabel = m.common_add();
  if (isEditing) {
    submitLabel = m.common_save();
  }
  if (saving) {
    submitLabel = m.common_saving();
  }

  const hasContent = description.trim().length > 0;

  const resetForm = () => {
    setDescription("");
    setPriority("");
    setCategory("");
    setStartDate("");
    setDueDate("");
  };

  useEffect(() => {
    if (!resolvedOpen) {
      return;
    }

    if (!editGoal) {
      setDescription("");
      setPriority("");
      setCategory("");
      setStartDate("");
      setDueDate("");
      return;
    }

    setDescription(editGoal.description.text ?? "");
    setPriority(editGoal.priority ?? "");
    setCategory(editGoal.category?.[0] ?? "");
    setStartDate(editGoal.startDate ?? "");
    setDueDate(editGoal.dueDate ?? "");
  }, [editGoal, resolvedOpen]);

  const setResolvedOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (!isControlled) {
      setInternalOpen(next);
    }
  };

  const parsedPriority = priority as GoalPriority;
  const parsedCategory = category as GoalCategory;

  const submitCreate = async () =>
    createGoal({
      description: description.trim(),
      subjectId: patientId ?? "",
      organizationId: selectedOrg?.id ?? "",
      userId: user?.id ?? "",
      userName: user?.name ?? "",
      ...(priority && { priority: parsedPriority }),
      ...(category && { category: [parsedCategory] }),
      ...(startDate && { startDate }),
      ...(dueDate && { dueDate }),
    });

  const submitEdit = async () => {
    if (!editGoal) {
      return;
    }

    await updateGoal({
      id: editGoal.id,
      description: description.trim(),
      organizationId: selectedOrg?.id ?? "",
      ...(priority && { priority: parsedPriority }),
      ...(category && { category: [parsedCategory] }),
      ...(startDate && { startDate }),
      ...(dueDate && { dueDate }),
    });
  };

  const handleSubmit = async () => {
    if (!patientId) {
      toast.error(m.onboarding_error());
      return;
    }

    if (!hasContent) {
      return;
    }

    setSaving(true);
    try {
      if (editGoal) {
        await submitEdit();
      } else {
        await submitCreate();
      }

      await queryClient.invalidateQueries({
        queryKey: personQueryKeys.goalsScope(personId),
      });
      await queryClient.invalidateQueries({
        queryKey: personQueryKeys.patientDetailScope(personId),
      });

      toast.success(isEditing ? m.goals_edit_success() : m.goals_add_success());
      setResolvedOpen(false);
      resetForm();
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={setResolvedOpen}>
      {children ? <DialogTrigger render={children as React.ReactElement} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? m.goals_edit_title() : m.goals_add()}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>{m.goals_description()}</FieldLabel>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={m.goals_description_placeholder()}
              disabled={saving}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{m.goals_priority()}</FieldLabel>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v ?? "")}
                items={PRIORITY_OPTIONS.map(({ value, label }) => ({ value, label: label() }))}
              >
                <SelectTrigger className="w-full" disabled={saving}>
                  <SelectValue placeholder={m.goals_priority_placeholder()} />
                </SelectTrigger>
                <SelectPositioner>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectPositioner>
              </Select>
            </Field>

            <Field>
              <FieldLabel>{m.goals_category()}</FieldLabel>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v ?? "")}
                items={CATEGORY_OPTIONS.map(({ value, label }) => ({ value, label: label() }))}
              >
                <SelectTrigger className="w-full" disabled={saving}>
                  <SelectValue placeholder={m.goals_category_placeholder()} />
                </SelectTrigger>
                <SelectPositioner>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectPositioner>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{m.goals_start_date()}</FieldLabel>
              <DatePickerString
                value={startDate}
                onChange={(v) => setStartDate(v)}
                disabled={saving}
              />
            </Field>

            <Field>
              <FieldLabel>{m.goals_due_date()}</FieldLabel>
              <DatePickerString value={dueDate} onChange={(v) => setDueDate(v)} disabled={saving} />
            </Field>
          </div>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setResolvedOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !hasContent}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
