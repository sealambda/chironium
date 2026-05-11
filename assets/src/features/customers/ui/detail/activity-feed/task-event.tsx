import { isBefore, isToday, parseISO, startOfDay } from "date-fns";

import { formatDayLabelFromIso } from "@/features/customers/utils/activity-feed-dates";
import type { PatientTask } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";

interface TaskEventProps {
  task: PatientTask;
}

export function TaskEvent({ task }: Readonly<TaskEventProps>) {
  const dueDate = task.requestedPeriod?.start ? parseISO(task.requestedPeriod.start) : null;
  const dueDay = dueDate ? startOfDay(dueDate) : null;
  const today = startOfDay(new Date());
  const isOverdue = dueDay ? isBefore(dueDay, today) : false;
  const isDueToday = dueDay ? isToday(dueDay) : false;
  let statusVariant: "destructive" | "warning" | "outline" = "outline";
  let statusLabel = m.review_task_status_pending();

  if (isOverdue) {
    statusVariant = "destructive";
    statusLabel = m.review_task_status_overdue();
  } else if (isDueToday) {
    statusVariant = "warning";
    statusLabel = m.review_task_status_due_today();
  }

  const dueCopy = task.requestedPeriod?.start
    ? formatDayLabelFromIso(task.requestedPeriod.start)
    : null;

  if (!task.description && !dueCopy) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant}>{statusLabel}</Badge>
        {dueCopy ? (
          <span className="text-muted-foreground text-xs">
            {m.review_task_due_relative({ when: dueCopy })}
          </span>
        ) : null}
      </div>
      {task.description ? <p className="text-foreground/80 text-sm">{task.description}</p> : null}
    </div>
  );
}
