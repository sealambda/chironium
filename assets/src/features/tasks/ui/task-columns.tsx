import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import type { Task } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { getDateLocale } from "@/shared/utils/date-locale";
import { formatPersonName } from "@/shared/utils/person-utils";

function formatPeriod(period: Task["requestedPeriod"]): string {
  const locale = getDateLocale();
  const start = period?.start ? new Date(period.start) : null;
  return start ? format(start, "PP", { locale }) : "—";
}

const intentLabelEntries: [NonNullable<Task["intent"]>, () => string][] = [
  ["FILLER_ORDER", m.tasks_intent_filler_order],
  ["INSTANCE_ORDER", m.tasks_intent_instance_order],
  ["OPTION", m.tasks_intent_option],
  ["ORDER", m.tasks_intent_order],
  ["ORIGINAL_ORDER", m.tasks_intent_original_order],
  ["PLAN", m.tasks_intent_plan],
  ["PROPOSAL", m.tasks_intent_proposal],
  ["REFLEX_ORDER", m.tasks_intent_reflex_order],
  ["UNKNOWN", m.tasks_intent_unknown],
];
const intentLabels = Object.fromEntries(intentLabelEntries) as Record<
  NonNullable<Task["intent"]>,
  () => string
>;

function formatIntent(intent: Task["intent"]): string {
  return intentLabels[intent]?.() ?? m.common_unknown();
}

const statusLabelEntries: [NonNullable<Task["status"]>, () => string][] = [
  ["ACCEPTED", m.tasks_status_accepted],
  ["CANCELLED", m.tasks_status_cancelled],
  ["COMPLETED", m.tasks_status_completed],
  ["DRAFT", m.tasks_status_draft],
  ["ENTERED_IN_ERROR", m.tasks_status_entered_in_error],
  ["FAILED", m.tasks_status_failed],
  ["IN_PROGRESS", m.tasks_status_in_progress],
  ["ON_HOLD", m.tasks_status_on_hold],
  ["READY", m.tasks_status_ready],
  ["RECEIVED", m.tasks_status_received],
  ["REJECTED", m.tasks_status_rejected],
  ["REQUESTED", m.tasks_status_requested],
];
const statusLabels = Object.fromEntries(statusLabelEntries) as Record<
  NonNullable<Task["status"]>,
  () => string
>;

export function formatStatus(status: Task["status"]): string {
  return statusLabels[status]?.() ?? m.common_unknown();
}

export const taskColumns: ColumnDef<Task, unknown>[] = [
  {
    id: "intent",
    enableSorting: false,
    accessorKey: "intent",
    header: () => m.tasks_col_intent(),
    cell: ({ getValue }) => (
      <span className="font-medium">{formatIntent(getValue() as Task["intent"])}</span>
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
    header: () => m.common_date(),
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
  {
    id: "description",
    enableSorting: false,
    accessorKey: "description",
    header: () => m.tasks_col_description(),
    cell: ({ getValue }) => (
      <div className="max-w-3xs truncate text-muted-foreground">
        {(getValue() as string) || "—"}
      </div>
    ),
  },
];
