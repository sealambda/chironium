import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";
import type { SubscriptionHistoryRecord } from "@/mocks/types";
import { Badge } from "@/shared/ui/badge";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";
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
        header: ({ column }) => (
          <SortableHeader column={column}>Start</SortableHeader>
        ),
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy"),
      },
      {
        accessorKey: "endDate",
        header: ({ column }) => (
          <SortableHeader column={column}>End</SortableHeader>
        ),
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy"),
      },
      {
        accessorKey: "planDurationMonths",
        header: "Duration",
        cell: ({ getValue }) => `${getValue()}mo`,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue() as keyof typeof subscriptionStatusConfig;
          return (
            <Badge
              variant={subscriptionStatusConfig[status]?.variant}
              className="capitalize"
            >
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
      title="Subscription History"
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel="Add Subscription"
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">
            No subscription history found
          </div>
        }
      />
    </HistoryDrawer>
  );
}
