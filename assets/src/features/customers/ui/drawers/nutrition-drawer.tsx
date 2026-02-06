import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";

import type { NutritionPlanRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";
import { getDateLocale } from "@/shared/utils/date-locale";

interface NutritionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: NutritionPlanRecord[];
  onAdd?: () => void;
}

/**
 * Drawer displaying nutrition plans history with sortable table.
 */
export function NutritionDrawer({ isOpen, onClose, data, onAdd }: Readonly<NutritionDrawerProps>) {
  const columns: ColumnDef<NutritionPlanRecord, unknown>[] = useMemo(
    () => [
      {
        id: "period",
        accessorKey: "startDate",
        header: ({ column }) => <SortableHeader column={column}>{m.table_period()}</SortableHeader>,
        cell: ({ row }) => {
          const locale = getDateLocale();
          const start = format(new Date(row.original.startDate), "MMM d, yy", {
            locale,
          });
          const end = row.original.endDate
            ? format(new Date(row.original.endDate), "MMM d, yy", { locale })
            : m.common_open();
          return `${start} — ${end}`;
        },
      },
      {
        accessorKey: "kcal",
        header: ({ column }) => <SortableHeader column={column}>{m.table_kcal()}</SortableHeader>,
        cell: ({ getValue }) => (getValue() as number).toLocaleString(),
      },
      {
        accessorKey: "protein",
        header: m.table_protein,
        cell: ({ getValue }) => `${getValue()}g`,
      },
      {
        accessorKey: "carbs",
        header: m.table_carbs,
        cell: ({ getValue }) => `${getValue()}g`,
      },
      {
        accessorKey: "fat",
        header: m.table_fat,
        cell: ({ getValue }) => `${getValue()}g`,
      },
    ],
    [],
  );

  return (
    <HistoryDrawer
      title={m.drawer_nutrition()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_plan()}
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">
            {m.empty_no_history()}
          </div>
        }
      />
    </HistoryDrawer>
  );
}
