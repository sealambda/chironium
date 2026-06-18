import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addYears, format, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { ClipboardClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createTask, fetchTasksForPatient } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { useOrg } from "@/shared/session/use-org";
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
import { toDateTimeEnd, toDateTimeStart } from "@/shared/utils/date-time-input";
import { personQueryKeys, tasksListQueryKey } from "@/shared/utils/query-keys";

interface AddTaskReminderDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

type ButtonVariant = "default" | "destructive" | "outline" | "secondary";

function getButtonVariant(taskDate: string | null | undefined): ButtonVariant {
  if (!taskDate) {
    return "outline";
  }

  const reviewDate = startOfDay(parseISO(taskDate));
  const today = startOfDay(new Date());

  if (isBefore(reviewDate, today)) {
    return "destructive";
  }

  if (isToday(reviewDate)) {
    return "default";
  }

  return "outline";
}

export function AddTaskReminderDialog({
  personId,
  patientId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Readonly<AddTaskReminderDialogProps>) {
  const [open, setOpen, isControlledOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const { data: pendingReviewTasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: personQueryKeys.reviewTasks(personId, selectedOrg?.id ?? "", patientId ?? ""),
    queryFn: async () => {
      const tasks = await fetchTasksForPatient(patientId ?? "", selectedOrg?.id ?? "");
      return tasks.filter((t) => t.status === "ACCEPTED" || t.status === "READY");
    },
    enabled: Boolean(selectedOrg?.id && patientId),
  });

  const form = useForm({
    defaultValues: {
      startDate: "",
      description: "",
    },
    onSubmit: async ({ value }) => {
      const description = value.description.trim();
      const startIso = toDateTimeStart(value.startDate);
      const endIso = toDateTimeEnd(value.startDate);

      if (!selectedOrg?.id || !description || !startIso || !endIso || !patientId) {
        return;
      }

      setSaving(true);
      try {
        await createTask({
          organizationId: selectedOrg.id,
          patientId,
          description,
          startDate: startIso,
          endDate: endIso,
        });

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: personQueryKeys.reviewTasksScope(personId),
          }),
          queryClient.invalidateQueries({
            queryKey: personQueryKeys.patientTasksScope(personId),
          }),
          queryClient.invalidateQueries({
            queryKey: tasksListQueryKey(selectedOrg.id),
          }),
        ]);

        toast.success(m.review_task_created());
        setOpen(false);
        form.reset();
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  const currentReadyTask = pendingReviewTasks[0] ?? null;
  const dialogTitle = m.review_task_add_new();
  const Icon = ClipboardClock;

  const pendingTaskDateFormatted = currentReadyTask?.requestedPeriod?.start
    ? format(startOfDay(parseISO(currentReadyTask.requestedPeriod.start)), "PP", {
        locale: getDateLocale(),
      })
    : null;
  const buttonLabel = pendingTaskDateFormatted || m.review_task_track();
  const buttonVariant = getButtonVariant(currentReadyTask?.requestedPeriod?.start);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlledOpen && (
        <DialogTrigger
          render={
            <Button
              variant={buttonVariant}
              size="sm"
              type="button"
              disabled={isTasksLoading}
              aria-label={buttonLabel}
            >
              <Icon data-icon="inline-start" aria-hidden="true" />
              <span>{buttonLabel}</span>
            </Button>
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">{m.review_task_hint_new()}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="startDate">
              {(field) => (
                <Field>
                  <FieldLabel>{m.review_task_field_date()}</FieldLabel>
                  <DatePickerString
                    value={field.state.value}
                    onChange={field.handleChange}
                    disabled={saving}
                    endMonth={addYears(new Date(), 5)}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <Field>
                  <FieldLabel>{m.review_task_field_description()}</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={m.review_task_description_placeholder()}
                    disabled={saving}
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              {m.common_cancel()}
            </Button>
            <form.Subscribe selector={(s) => s.values}>
              {(values) => {
                const isSubmitDisabled = !values.startDate || !values.description.trim();
                return (
                  <Button type="submit" loading={saving} disabled={isSubmitDisabled}>
                    {m.review_task_add_new()}
                  </Button>
                );
              }}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
