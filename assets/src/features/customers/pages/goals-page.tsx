import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { fetchAllGoals, type GoalRecord } from "@/features/customers/api/goals-api";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.goals";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { NotesPopover } from "@/shared/ui/notes-popover";
import { Skeleton } from "@/shared/ui/skeleton";

const columns: ColumnDef<GoalRecord, unknown>[] = [
  {
    accessorFn: (row) => row.description.text,
    id: "description",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.goals_col_description()}</SortableHeader>
    ),
  },
  {
    accessorKey: "lifecycleStatus",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.goals_col_lifecycle()}</SortableHeader>
    ),
  },
  {
    accessorKey: "achievementStatus",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.goals_col_achievement()}</SortableHeader>
    ),
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.goals_col_priority()}</SortableHeader>
    ),
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.goals_col_start_date()}</SortableHeader>
    ),
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.goals_col_due_date()}</SortableHeader>
    ),
  },
  {
    id: "notes",
    cell: ({ row }) => <NotesPopover notes={row.original.note ?? []} />,
    enableSorting: false,
  },
];

export function GoalsPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();

  useDetailModeEffect(<HistoryDetailHeader />, "goals");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "goals", selectedOrg?.id],
    queryFn: () => fetchAllGoals(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <h1 className="font-semibold text-lg">{m.goals_title()}</h1>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={data ?? []} pinFirstColumn />
      )}
    </div>
  );
}
