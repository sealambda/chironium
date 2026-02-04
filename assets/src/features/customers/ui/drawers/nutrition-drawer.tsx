import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";
import type { NutritionPlanRecord } from "@/mocks/types";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";

interface NutritionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: NutritionPlanRecord[];
  onAdd?: () => void;
}

/**
 * Drawer displaying nutrition plans history with sortable table.
 */
export function NutritionDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
}: Readonly<NutritionDrawerProps>) {
  const columns: ColumnDef<NutritionPlanRecord, unknown>[] = useMemo(
    () => [
      {
        id: "period",
        accessorKey: "startDate",
        header: ({ column }) => (
          <SortableHeader column={column}>Period</SortableHeader>
        ),
        cell: ({ row }) => {
          const start = format(new Date(row.original.startDate), "MMM d, yy");
          const end = row.original.endDate
            ? format(new Date(row.original.endDate), "MMM d, yy")
            : "Open";
          return `${start} — ${end}`;
        },
      },
      {
        accessorKey: "kcal",
        header: ({ column }) => (
          <SortableHeader column={column}>Kcal</SortableHeader>
        ),
        cell: ({ getValue }) => (getValue() as number).toLocaleString(),
      },
      {
        accessorKey: "protein",
        header: "P",
        cell: ({ getValue }) => `${getValue()}g`,
      },
      {
        accessorKey: "carbs",
        header: "C",
        cell: ({ getValue }) => `${getValue()}g`,
      },
      {
        accessorKey: "fat",
        header: "F",
        cell: ({ getValue }) => `${getValue()}g`,
      },
    ],
    [],
  );

  const handleAdd = () => {
    // TODO: Implement add nutrition plan form
    console.log("Add nutrition plan clicked");
    onAdd?.();
  };

  return (
    <HistoryDrawer
      title="Nutrition Plans"
      isOpen={isOpen}
      onClose={onClose}
      onAdd={handleAdd}
      addButtonLabel="Add Plan"
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">
            No nutrition plans found
          </div>
        }
      />
    </HistoryDrawer>
  );
}
