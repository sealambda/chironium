import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DeleteHistoryEntryDialog } from "@/features/customers/ui/detail/delete-history-entry-dialog";
import { useOrg } from "@/features/org/hooks/use-org";
import {
  deleteTaskReminder,
  type PatientTask,
  updateTaskReminder,
} from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input } from "@/shared/ui/input";
import {
  isoToDateInput,
  toUtcDateTimeEnd,
  toUtcDateTimeStart,
} from "@/shared/utils/date-time-input";
import { personQueryKeys } from "@/shared/utils/query-keys";

interface EditTaskReminderDialogProps {
  personId: string;
  task: PatientTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskReminderDialog({
  personId,
  task,
  open,
  onOpenChange,
}: Readonly<EditTaskReminderDialogProps>) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initialStartDate = isoToDateInput(task.requestedPeriod?.start);

  const form = useForm({
    defaultValues: {
      startDate: initialStartDate,
      description: task.description ?? "",
    },
    onSubmit: async ({ value }) => {
      const description = value.description.trim();
      const startDate = toUtcDateTimeStart(value.startDate);
      const endDate = toUtcDateTimeEnd(value.startDate);

      if (!selectedOrg?.id || !description || !startDate || !endDate) {
        return;
      }

      setSaving(true);
      try {
        await updateTaskReminder({
          organizationId: selectedOrg.id,
          taskId: task.id,
          description,
          startDate,
          endDate,
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: personQueryKeys.reviewTasksScope(personId) }),
          queryClient.invalidateQueries({ queryKey: personQueryKeys.patientTasksScope(personId) }),
        ]);

        toast.success(m.review_task_updated());
        onOpenChange(false);
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      startDate: initialStartDate,
      description: task.description ?? "",
    });
  }, [form, initialStartDate, open, task.description]);

  const dateLabel = task.description?.trim() || m.review_task_track();

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={m.review_task_edit_title()}
        description={m.review_task_edit_hint({ description: dateLabel })}
        onDelete={() => setDeleteOpen(true)}
        onSubmit={() => form.handleSubmit()}
        submitDisabled={!form.state.values.startDate || !form.state.values.description.trim()}
        saving={saving}
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
      </FormDialog>

      <DeleteHistoryEntryDialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteOpen(false);
          }
        }}
        deleting={deleting}
        onConfirm={async () => {
          const organizationId = selectedOrg?.id ?? "";
          setDeleting(true);

          try {
            await deleteTaskReminder(task.id, organizationId);
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: personQueryKeys.reviewTasksScope(personId),
              }),
              queryClient.invalidateQueries({
                queryKey: personQueryKeys.patientTasksScope(personId),
              }),
            ]);

            toast.success(m.review_task_deleted());
            setDeleteOpen(false);
            onOpenChange(false);
          } catch {
            toast.error(m.onboarding_error());
          } finally {
            setDeleting(false);
          }
        }}
      />
    </>
  );
}
