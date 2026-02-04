import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";
import type { PathologyRecord } from "@/mocks/types";
import { Badge } from "@/shared/ui/badge";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";

const statusConfig = {
  active: { variant: "destructive" as const },
  managed: { variant: "outline" as const },
  resolved: { variant: "secondary" as const },
};

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
        header: ({ column }) => (
          <SortableHeader column={column}>Name</SortableHeader>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => (
          <span className="capitalize text-muted-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <SortableHeader column={column}>Status</SortableHeader>
        ),
        cell: ({ getValue }) => {
          const status = getValue() as keyof typeof statusConfig;
          return (
            <Badge
              variant={statusConfig[status].variant}
              className="capitalize"
            >
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "diagnosedDate",
        header: ({ column }) => (
          <SortableHeader column={column}>Diagnosed</SortableHeader>
        ),
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM yyyy"),
      },
    ],
    [],
  );

  const handleAdd = () => {
    // TODO: Implement add pathology form
    console.log("Add pathology clicked");
    onAdd?.();
  };

  return (
    <HistoryDrawer
      title="Pathologies"
      isOpen={isOpen}
      onClose={onClose}
      onAdd={handleAdd}
      addButtonLabel="Add Pathology"
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">
            No pathologies recorded
          </div>
        }
      />
    </HistoryDrawer>
  );
}
