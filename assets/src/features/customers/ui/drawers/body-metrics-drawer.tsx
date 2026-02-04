import type { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";
import type { BodyMetricsRecord } from "@/mocks/types";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";

interface MeasurementsGridProps {
  record: BodyMetricsRecord;
}

function MeasurementsGrid({ record }: Readonly<MeasurementsGridProps>) {
  const { measurements } = record;

  const items = [
    { label: "Hip", value: measurements.hip },
    { label: "Waist", value: measurements.waist },
    { label: "Chest", value: measurements.chest },
    { label: "Biceps L", value: measurements.bicepsLeft },
    { label: "Biceps R", value: measurements.bicepsRight },
    { label: "Quads L", value: measurements.quadricepsLeft },
    { label: "Quads R", value: measurements.quadricepsRight },
  ].filter((item) => item.value !== undefined);

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No detailed measurements recorded
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      {items.map(({ label, value }) => (
        <div key={label} className="text-sm">
          <span className="text-muted-foreground">{label}:</span>
          <span className="ml-1 font-medium">{value} cm</span>
        </div>
      ))}
    </div>
  );
}

interface BodyMetricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: BodyMetricsRecord[];
  onAdd?: () => void;
}

/**
 * Drawer displaying body metrics history with expandable rows for measurements.
 */
export function BodyMetricsDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
}: Readonly<BodyMetricsDrawerProps>) {
  const columns: ColumnDef<BodyMetricsRecord, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <SortableHeader column={column}>Date</SortableHeader>
        ),
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy"),
      },
      {
        accessorKey: "weight",
        header: ({ column }) => (
          <SortableHeader column={column}>Weight</SortableHeader>
        ),
        cell: ({ getValue }) => `${getValue()} kg`,
      },
      {
        accessorKey: "heightM",
        header: "Height",
        cell: ({ getValue }) => {
          const heightM = getValue() as number;
          return `${Math.round(heightM * 100)} cm`;
        },
      },
      {
        accessorKey: "bmi",
        header: ({ column }) => (
          <SortableHeader column={column}>BMI</SortableHeader>
        ),
        cell: ({ getValue }) => (getValue() as number).toFixed(1),
      },
    ],
    [],
  );

  const renderExpandedRow = (row: Row<BodyMetricsRecord>) => (
    <MeasurementsGrid record={row.original} />
  );

  const handleAdd = () => {
    // TODO: Implement add body metrics form
    console.log("Add body metrics clicked");
    onAdd?.();
  };

  return (
    <HistoryDrawer
      title="Body Metrics History"
      isOpen={isOpen}
      onClose={onClose}
      onAdd={handleAdd}
      addButtonLabel="Add Record"
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        renderExpandedRow={renderExpandedRow}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">
            No body metrics recorded
          </div>
        }
      />
    </HistoryDrawer>
  );
}
