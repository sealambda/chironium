import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";

import type { PathologyRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";
import { getDateLocale } from "@/shared/utils/date-locale";

import { pathologyStatusConfig } from "../../model/status-config";

interface PathologiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: PathologyRecord[];
  onAdd?: () => void;
}

/**
 * Drawer displaying pathologies list with status badges.
 */
export function PathologiesDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
}: Readonly<PathologiesDrawerProps>) {
  const columns: ColumnDef<PathologyRecord, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "pathologyName",
        header: ({ column }) => <SortableHeader column={column}>{m.table_name()}</SortableHeader>,
      },
      {
        accessorKey: "category",
        header: m.table_category,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground capitalize">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>{m.table_status()}</SortableHeader>,
        cell: ({ getValue }) => {
          const status = getValue() as keyof typeof pathologyStatusConfig;
          return (
            <Badge variant={pathologyStatusConfig[status]?.variant} className="capitalize">
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "diagnosedDate",
        header: ({ column }) => (
          <SortableHeader column={column}>{m.table_diagnosed()}</SortableHeader>
        ),
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM yyyy", {
            locale: getDateLocale(),
          }),
      },
    ],
    [],
  );

  return (
    <HistoryDrawer
      title={m.drawer_pathologies()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_pathology()}
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">{m.empty_no_data()}</div>
        }
      />
    </HistoryDrawer>
  );
}
