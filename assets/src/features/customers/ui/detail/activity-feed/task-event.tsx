import { format, parseISO } from "date-fns";

import type { PatientTask } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { getDateLocale } from "@/shared/utils/date-locale";
import { cn } from "@/shared/utils/utils";

interface TaskEventProps {
  task: PatientTask;
}

const PRIORITY_STYLES = new Map([
  ["ROUTINE", "hidden"],
  ["URGENT", "border-amber-200 bg-amber-100 text-amber-800"],
  ["ASAP", "border-orange-200 bg-orange-100 text-orange-800"],
  ["STAT", "border-red-200 bg-red-100 text-red-800"],
]);

const PRIORITY_LABELS = new Map<string, () => string>([
  ["ROUTINE", m.activity_task_priority_routine],
  ["URGENT", m.activity_task_priority_urgent],
  ["ASAP", m.activity_task_priority_asap],
  ["STAT", m.activity_task_priority_stat],
]);

const STATUS_STYLES = new Map([
  ["READY", "border-sky-200 bg-sky-100 text-sky-800"],
  ["ACCEPTED", "border-blue-200 bg-blue-100 text-blue-800"],
  ["IN_PROGRESS", "border-amber-200 bg-amber-100 text-amber-800"],
  ["COMPLETED", "border-emerald-200 bg-emerald-100 text-emerald-800"],
  ["CANCELLED", "border-neutral-200 bg-neutral-100 text-neutral-600"],
  ["REJECTED", "border-red-200 bg-red-100 text-red-800"],
]);

const STATUS_LABELS = new Map<string, () => string>([
  ["DRAFT", m.activity_task_status_draft],
  ["REQUESTED", m.activity_task_status_requested],
  ["RECEIVED", m.activity_task_status_received],
  ["ACCEPTED", m.activity_task_status_accepted],
  ["REJECTED", m.activity_task_status_rejected],
  ["READY", m.activity_task_status_ready],
  ["CANCELLED", m.activity_task_status_cancelled],
  ["IN_PROGRESS", m.activity_task_status_in_progress],
  ["ON_HOLD", m.activity_task_status_on_hold],
  ["FAILED", m.activity_task_status_failed],
  ["COMPLETED", m.activity_task_status_completed],
  ["ENTERED_IN_ERROR", m.activity_task_status_entered_in_error],
]);

export function TaskEvent({ task }: Readonly<TaskEventProps>) {
  const priorityKey = task.priority?.toUpperCase() ?? "ROUTINE";
  const statusKey = task.status?.toUpperCase() ?? "";
  const priorityStyle = PRIORITY_STYLES.get(priorityKey);
  const statusStyle =
    STATUS_STYLES.get(statusKey) ?? "border-neutral-200 bg-neutral-100 text-neutral-600";
  const statusLabel = STATUS_LABELS.get(statusKey)?.() ?? task.status;

  const start = task.requestedPeriod?.start;
  const formattedDate = start
    ? format(parseISO(start), "MMM d, yyyy", { locale: getDateLocale() })
    : null;

  return (
    <div className="space-y-1.5">
      {task.description ? <p className="text-foreground/80 text-sm">{task.description}</p> : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {priorityStyle && priorityStyle !== "hidden" ? (
          <Badge className={cn("h-4.5 px-1.5 font-medium text-xs", priorityStyle)}>
            {PRIORITY_LABELS.get(priorityKey)?.() ?? priorityKey}
          </Badge>
        ) : null}
        <Badge className={cn("h-4.5 px-1.5 font-medium text-xs", statusStyle)}>{statusLabel}</Badge>
        {formattedDate ? (
          <time dateTime={start ?? undefined} className="text-muted-foreground text-xs">
            {formattedDate}
          </time>
        ) : null}
      </div>
    </div>
  );
}
