import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";

import type { SubscriptionHistoryRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";
import { getDateLocale } from "@/shared/utils/date-locale";

import { subscriptionStatusConfig } from "../../model/status-config";

interface SubscriptionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: SubscriptionHistoryRecord[];
  onAdd?: () => void;
}

/**
 * Drawer displaying full subscription history with sortable table.
 */
export function SubscriptionDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
}: Readonly<SubscriptionDrawerProps>) {
  const columns: ColumnDef<SubscriptionHistoryRecord, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "startDate",
        header: ({ column }) => <SortableHeader column={column}>{m.table_start()}</SortableHeader>,
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy", {
            locale: getDateLocale(),
          }),
      },
      {
        accessorKey: "endDate",
        header: ({ column }) => <SortableHeader column={column}>{m.table_end()}</SortableHeader>,
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy", {
            locale: getDateLocale(),
          }),
      },
      {
        accessorKey: "planDurationMonths",
        header: m.table_duration,
        cell: ({ getValue }) => `${getValue()}mo`,
      },
      {
        accessorKey: "status",
        header: m.table_status,
        cell: ({ getValue }) => {
          const status = getValue() as keyof typeof subscriptionStatusConfig;
          return (
            <Badge variant={subscriptionStatusConfig[status]?.variant} className="capitalize">
              {status}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  return (
    <HistoryDrawer
      title={m.drawer_subscription()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_subscription()}
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
