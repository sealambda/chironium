import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { createGoal } from "@/features/customers/api/goals-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
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
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────

export function AddGoalDialog({ personId, patientId, children }: Readonly<AddGoalDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const hasContent = description.trim().length > 0;

  const resetForm = () => {
    setDescription("");
    setPriority("");
    setCategory("");
    setStartDate("");
    setDueDate("");
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
      await createGoal({
        description: description.trim(),
        subjectId: patientId,
        organizationId: selectedOrg?.id ?? "",
        userId: user?.id ?? "",
        userName: user?.name ?? "",
        ...(priority && {
          priority: priority as "HIGH_PRIORITY" | "MEDIUM_PRIORITY" | "LOW_PRIORITY",
        }),
        ...(category && {
          category: [category as "DIETARY" | "BEHAVIORAL" | "NURSING" | "PHYSIOTHERAPY" | "SAFETY"],
        }),
        ...(startDate && { startDate }),
        ...(dueDate && { dueDate }),
      });

      await queryClient.invalidateQueries({
        queryKey: ["person", personId, "goals"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["person", personId, "patient-detail"],
      });

      toast.success(m.goals_add_success());
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
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.goals_add()}</DialogTitle>
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !hasContent}>
            {saving ? m.common_saving() : m.common_add()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
