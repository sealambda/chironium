import type { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";

import type { BodyMetricsRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";
import { getDateLocale } from "@/shared/utils/date-locale";
import { heightMetersToCm } from "@/shared/utils/measurement-utils";

interface MeasurementsGridProps {
  record: BodyMetricsRecord;
}

function MeasurementsGrid({ record }: Readonly<MeasurementsGridProps>) {
  const { measurements } = record;

  const items = [
    { label: m.measurement_chest(), value: measurements.chest },
    { label: m.measurement_waist(), value: measurements.waist },
    { label: m.measurement_hip(), value: measurements.hip },
    { label: m.measurement_biceps(), value: measurements.biceps },
    { label: m.measurement_quadriceps(), value: measurements.quadriceps },
  ].filter((item) => item.value !== undefined);

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{m.empty_no_measurements()}</p>;
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
        header: ({ column }) => <SortableHeader column={column}>{m.table_date()}</SortableHeader>,
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy", {
            locale: getDateLocale(),
          }),
      },
      {
        accessorKey: "weight",
        header: ({ column }) => <SortableHeader column={column}>{m.table_weight()}</SortableHeader>,
        cell: ({ getValue }) => `${getValue()} kg`,
      },
      {
        accessorKey: "heightM",
        header: m.table_height,
        cell: ({ getValue }) => `${heightMetersToCm(getValue() as number)} cm`,
      },
      {
        accessorKey: "bmi",
        header: ({ column }) => <SortableHeader column={column}>{m.table_bmi()}</SortableHeader>,
        cell: ({ getValue }) => (getValue() as number).toFixed(1),
      },
    ],
    [],
  );

  const renderExpandedRow = (row: Row<BodyMetricsRecord>) => (
    <MeasurementsGrid record={row.original} />
  );

  return (
    <HistoryDrawer
      title={m.drawer_body_metrics()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_record()}
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        renderExpandedRow={renderExpandedRow}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">{m.empty_no_data()}</div>
        }
      />
    </HistoryDrawer>
  );
}
