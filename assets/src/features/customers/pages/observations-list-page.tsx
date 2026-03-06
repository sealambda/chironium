import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";

import {
  fetchObservationsList,
  getObservationDisplayValue,
  type ObservationItem,
} from "@/features/customers/api/observations-api";
import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { AddObservationDialog } from "@/features/customers/ui/detail/add-observation-dialog";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.observations";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { NotesPopover } from "@/shared/ui/notes-popover";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "\u2014";
  }
  return format(new Date(value), "PP", { locale: getDateLocale() });
}

const columns: ColumnDef<ObservationItem, unknown>[] = [
  {
    id: "date",
    accessorKey: "effectiveDateTime",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.observations_col_date()}</SortableHeader>
    ),
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap">{formatDate(getValue() as string | null)}</span>
    ),
    sortingFn: "datetime",
  },
  {
    id: "value",
    accessorFn: (row) => getObservationDisplayValue(row),
    header: ({ column }) => (
      <SortableHeader column={column}>{m.observations_col_value()}</SortableHeader>
    ),
    cell: ({ getValue }) => (
      <p className="break-words text-justify text-sm">{getValue() as string}</p>
    ),
  },
  {
    id: "notes",
    cell: ({ row }) => <NotesPopover notes={row.original.note ?? []} />,
    enableSorting: false,
  },
];

export function ObservationsListPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const { patientId } = usePersonDetail(customerId);

  useDetailModeEffect(<HistoryDetailHeader customerId={customerId} />, "observations-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "observationsList", selectedOrg?.id],
    queryFn: () => fetchObservationsList(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-lg">{m.observations_title()}</h1>
        <AddObservationDialog personId={customerId} patientId={patientId}>
          <Button variant="outline" size="sm">
            <PlusIcon className="size-4" data-icon="inline-start" />
            {m.observations_add()}
          </Button>
        </AddObservationDialog>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          sorting={[{ id: "date", desc: true }]}
          pinFirstColumn
        />
      )}
    </div>
  );
}
