import type { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";
import { getSymptomById } from "@/mocks/data/catalogs";
import type { CycleRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";
import { getDateLocale } from "@/shared/utils/date-locale";

interface SymptomsListProps {
  symptoms: string[];
}

function SymptomsList({ symptoms }: Readonly<SymptomsListProps>) {
  if (symptoms.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{m.empty_no_symptoms()}</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {symptoms.map((symptomId) => {
        const symptom = getSymptomById(symptomId);
        return (
          <Badge key={symptomId} variant="outline">
            {symptom?.name ?? symptomId}
          </Badge>
        );
      })}
    </div>
  );
}

interface CycleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: CycleRecord[];
  onAdd?: () => void;
}

/**
 * Drawer displaying cycle history with expandable rows for symptoms.
 */
export function CycleDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
}: Readonly<CycleDrawerProps>) {
  const columns: ColumnDef<CycleRecord, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "startDate",
        header: ({ column }) => (
          <SortableHeader column={column}>{m.table_start()}</SortableHeader>
        ),
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy", {
            locale: getDateLocale(),
          }),
      },
      {
        accessorKey: "endDate",
        header: m.table_end,
        cell: ({ getValue }) => {
          const endDate = getValue() as string | undefined;
          return endDate
            ? format(new Date(endDate), "MMM d, yyyy", {
                locale: getDateLocale(),
              })
            : m.common_ongoing();
        },
      },
      {
        accessorKey: "cycleLength",
        header: m.table_length,
        cell: ({ getValue }) => {
          const length = getValue() as number | undefined;
          return length ? `${length}d` : "—";
        },
      },
      {
        id: "symptomsCount",
        accessorFn: (row) => row.symptoms.length,
        header: m.table_symptoms,
        cell: ({ getValue }) => getValue(),
      },
    ],
    [],
  );

  const renderExpandedRow = (row: Row<CycleRecord>) => (
    <SymptomsList symptoms={row.original.symptoms} />
  );

  return (
    <HistoryDrawer
      title={m.drawer_cycle()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_cycle()}
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        renderExpandedRow={renderExpandedRow}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">
            {m.empty_no_history()}
          </div>
        }
      />
    </HistoryDrawer>
  );
}
