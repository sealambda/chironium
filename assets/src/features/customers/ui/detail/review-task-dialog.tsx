import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addMinutes, addYears, parseISO } from "date-fns";
import { ClipboardCheck, ClipboardClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CurrentReviewTaskSummary } from "@/features/customers/ui/detail/current-review-task-summary";
import { useOrg } from "@/features/org/hooks/use-org";
import {
  completeReviewTask,
  createTask,
  fetchPendingPlanReviewTasksForPatient,
} from "@/features/tasks/api/tasks-api";
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
import { toDateTimeInput } from "@/shared/utils/date-time-input";

interface ReviewTaskDialogProps {
  personId: string;
  patientId: string;
}

function toUtcIsoStart(date: string, time: string): string | null {
  const iso = toDateTimeInput(date, time);
  return iso ?? null;
}

function toUtcIsoEnd(startIso: string, durationMinutes: number): string {
  return addMinutes(parseISO(startIso), durationMinutes).toISOString();
}

async function completeCurrentTaskIfAny(
  pendingReviewTaskId: string | undefined,
  organizationId: string,
) {
  if (!pendingReviewTaskId) {
    return;
  }
  await completeReviewTask(pendingReviewTaskId, organizationId);
}

export function ReviewTaskDialog({ personId, patientId }: Readonly<ReviewTaskDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const { data: pendingReviewTasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ["person", personId, "review-tasks", selectedOrg?.id, patientId],
    queryFn: () => fetchPendingPlanReviewTasksForPatient(patientId, selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg?.id && patientId),
  });

  const hasPendingReviewTasks = pendingReviewTasks.length > 0;
  const currentReadyTask = pendingReviewTasks[0] ?? null;
  const hasDescription = description.trim().length > 0;
  const durationValue = Number.parseInt(durationMinutes, 10);
  const hasDuration = Number.isFinite(durationValue) && durationValue > 0;
  const hasStartDateTime = Boolean(startDate && startTime);
  const startIso = hasStartDateTime ? toUtcIsoStart(startDate, startTime) : null;
  const endIso = startIso && hasDuration ? toUtcIsoEnd(startIso, durationValue) : null;

  const resetForm = () => {
    setDescription("");
    setStartDate("");
    setStartTime("");
    setDurationMinutes("");
  };

  const handleSubmit = async () => {
    if (!selectedOrg?.id || !hasDescription || !startIso || !endIso) {
      return;
    }

    setSaving(true);
    try {
      const taskToCompleteId = hasPendingReviewTasks ? pendingReviewTasks[0]?.id : undefined;
      await completeCurrentTaskIfAny(taskToCompleteId, selectedOrg.id);

      await createTask({
        organizationId: selectedOrg.id,
        patientId,
        description: description.trim(),
        startDate: startIso,
        endDate: endIso,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["person", personId, "review-tasks"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list", selectedOrg.id],
        }),
      ]);

      toast.success(m.review_task_created());
      setOpen(false);
      resetForm();
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  const buttonLabel = hasPendingReviewTasks ? m.review_task_complete() : m.review_task_track();
  const dialogTitle = hasPendingReviewTasks ? m.review_task_add_next() : m.review_task_add_new();
  const Icon = hasPendingReviewTasks ? ClipboardCheck : ClipboardClock;

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="outline" size="sm" type="button" disabled={isTasksLoading}>
              <Icon className="size-4 xl:mr-1" />
              <span className="hidden xl:inline">{buttonLabel}</span>
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel>{m.tasks_col_description()}</FieldLabel>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={m.review_task_description_placeholder()}
                disabled={saving}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>{m.goals_start_date()}</FieldLabel>
                <DatePickerString
                  value={startDate}
                  onChange={setStartDate}
                  disabled={saving}
                  endMonth={addYears(new Date(), 5)}
                />
              </Field>
              <Field>
                <FieldLabel>{m.common_time()}</FieldLabel>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>{m.review_task_duration_minutes()}</FieldLabel>
              <Input
                type="number"
                min={1}
                step={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder={m.review_task_duration_minutes_placeholder()}
                disabled={saving}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {m.common_cancel()}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !hasDescription || !hasStartDateTime || !hasDuration || !endIso}
            >
              {saving ? m.common_saving() : m.common_add()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {currentReadyTask ? (
        <CurrentReviewTaskSummary
          description={currentReadyTask.description}
          startDateTime={currentReadyTask.requestedPeriod?.start}
        />
      ) : null}
    </div>
  );
}
