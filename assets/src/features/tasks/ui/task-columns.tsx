import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import type { Task } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { getDateLocale } from "@/shared/utils/date-locale";
import { formatPersonName } from "@/shared/utils/person-utils";

function formatPeriod(period: Task["requestedPeriod"]): string {
  const locale = getDateLocale();
  const start = period?.start ? new Date(period.start) : null;
  const end = period?.end ? new Date(period.end) : null;

  const startLabel = start ? format(start, "PPp", { locale }) : null;
  const endLabel = end ? format(end, "PPp", { locale }) : null;

  if (startLabel && endLabel) {
    return `${startLabel} – ${endLabel}`;
  }
  if (startLabel) {
    return startLabel;
  }
  if (endLabel) {
    return endLabel;
  }
  return "—";
}

function formatStatus(status: Task["status"]): string {
  if (status === "ACCEPTED") {
    return m.tasks_status_accepted();
  }
  if (status === "CANCELLED") {
    return m.tasks_status_cancelled();
  }
  if (status === "COMPLETED") {
    return m.tasks_status_completed();
  }
  if (status === "DRAFT") {
    return m.tasks_status_draft();
  }
  if (status === "ENTERED_IN_ERROR") {
    return m.tasks_status_entered_in_error();
  }
  if (status === "FAILED") {
    return m.tasks_status_failed();
  }
  if (status === "IN_PROGRESS") {
    return m.tasks_status_in_progress();
  }
  if (status === "ON_HOLD") {
    return m.tasks_status_on_hold();
  }
  if (status === "READY") {
    return m.tasks_status_ready();
  }
  if (status === "RECEIVED") {
    return m.tasks_status_received();
  }
  if (status === "REJECTED") {
    return m.tasks_status_rejected();
  }
  if (status === "REQUESTED") {
    return m.tasks_status_requested();
  }
  if (status === "UNKNOWN") {
    return m.tasks_status_unknown();
  }
  return m.common_unknown();
}

export const taskColumns: ColumnDef<Task, unknown>[] = [
  {
    id: "description",
    enableSorting: false,
    accessorKey: "description",
    header: () => m.tasks_col_description(),
    cell: ({ getValue }) => (
      <span className="line-clamp-2 font-medium">{(getValue() as string | null) || "—"}</span>
    ),
  },
  {
    id: "status",
    enableSorting: false,
    accessorKey: "status",
    header: () => m.tasks_col_status(),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{formatStatus(getValue() as Task["status"])}</span>
    ),
  },
  {
    id: "requestedPeriod",
    enableSorting: false,
    accessorFn: (row) => row.requestedPeriod?.start ?? null,
    header: () => m.tasks_col_requested_period(),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatPeriod(row.original.requestedPeriod)}</span>
    ),
  },
  {
    id: "patient",
    enableSorting: false,
    accessorFn: (row) => formatPersonName(row.forPatient?.person?.name),
    header: () => m.tasks_col_patient(),
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span>,
  },
];
