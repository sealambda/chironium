import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addYears, format, isAfter, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { ClipboardCheck, ClipboardClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { getDateLocale } from "@/shared/utils/date-locale";

interface ReviewTaskDialogProps {
  personId: string;
  patientId: string;
}

function toUtcIsoStart(dateStr: string): string | null {
  if (!dateStr) {
    return null;
  }
  // Build directly as UTC to avoid local-timezone shifting the date.
  return `${dateStr}T09:00:00.000Z`;
}

function toUtcIsoEnd(dateStr: string): string {
  if (!dateStr) {
    return "";
  }
  return `${dateStr}T23:59:59.999Z`;
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

function getButtonColorClass(taskDate: string | null | undefined): string {
  if (!taskDate) {
    return "";
  }

  const reviewDate = startOfDay(parseISO(taskDate));
  const today = startOfDay(new Date());

  if (isBefore(reviewDate, today)) {
    // Red: overdue (before today)
    return "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50";
  }

  if (isToday(reviewDate)) {
    // Yellow: today
    return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50";
  }

  if (isAfter(reviewDate, today)) {
    // Green: future (on track)
    return "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-950/50";
  }

  return "";
}

export function ReviewTaskDialog({ personId, patientId }: Readonly<ReviewTaskDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
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
  const hasStartDate = Boolean(startDate);
  const startIso = hasStartDate ? toUtcIsoStart(startDate) : null;
  const endIso = startIso ? toUtcIsoEnd(startDate) : null;

  const resetForm = () => {
    setDescription("");
    setStartDate("");
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

  const dialogTitle = hasPendingReviewTasks ? m.review_task_add_next() : m.review_task_add_new();
  const Icon = hasPendingReviewTasks ? ClipboardCheck : ClipboardClock;

  const pendingTaskDateFormatted = currentReadyTask?.requestedPeriod?.start
    ? format(startOfDay(parseISO(currentReadyTask.requestedPeriod.start)), "PP", {
        locale: getDateLocale(),
      })
    : null;
  const buttonLabel = pendingTaskDateFormatted || m.review_task_track();
  const buttonColorClass = getButtonColorClass(currentReadyTask?.requestedPeriod?.start);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={isTasksLoading}
            className={buttonColorClass}
          >
            <Icon className="size-4 xl:mr-1" />
            <span className="hidden xl:inline">{buttonLabel}</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          {hasPendingReviewTasks && pendingTaskDateFormatted
            ? m.review_task_hint_next({ date: pendingTaskDateFormatted })
            : m.review_task_hint_new()}
        </p>

        <FieldGroup>
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
            <FieldLabel>{m.tasks_col_description()}</FieldLabel>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={m.review_task_description_placeholder()}
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
            disabled={saving || !hasDescription || !hasStartDate || !endIso}
          >
            {saving ? m.common_saving() : m.common_add()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
