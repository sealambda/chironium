import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";

import {
  fetchObservationsList,
  getObservationDisplayValue,
  getObservationLabel,
  isClinicalNote,
  type ObservationItem,
  parseClinicalNote,
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
import { MarkdownContent } from "@/shared/ui/markdown-content";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "\u2014";
  }
  return format(new Date(value), "PP", { locale: getDateLocale() });
}

function getRowTitle(obs: ObservationItem): string {
  if (isClinicalNote(obs)) {
    return parseClinicalNote(obs).title;
  }
  return getObservationDisplayValue(obs);
}

const columns: ColumnDef<ObservationItem, unknown>[] = [
  {
    id: "date",
    accessorKey: "effectiveDateTime",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.observations_col_date()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatDate(getValue() as string | null),
    sortingFn: "datetime",
  },
  {
    id: "type",
    accessorFn: (row) => getObservationLabel(row.code),
    header: ({ column }) => (
      <SortableHeader column={column}>{m.observations_col_type()}</SortableHeader>
    ),
  },
  {
    id: "value",
    accessorFn: (row) => getRowTitle(row),
    header: ({ column }) => (
      <SortableHeader column={column}>{m.observations_col_value()}</SortableHeader>
    ),
    cell: ({ getValue }) => {
      const title = getValue() as string;
      return <span className="line-clamp-1 max-w-md">{title}</span>;
    },
  },
];

function ExpandedObservation({ row }: Readonly<{ row: Row<ObservationItem> }>) {
  const obs = row.original;

  if (isClinicalNote(obs)) {
    const { title, body } = parseClinicalNote(obs);
    return (
      <div className="max-w-2xl space-y-2">
        <h2 className="font-semibold text-foreground text-lg">{title}</h2>
        {body ? (
          <MarkdownContent content={body} />
        ) : (
          <p className="text-foreground/50 text-sm italic">{"\u2014"}</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <p className="text-foreground/80 text-sm">{getObservationDisplayValue(obs)}</p>
    </div>
  );
}

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
          renderExpandedRow={(row) => <ExpandedObservation row={row} />}
          pinFirstColumn
        />
      )}
    </div>
  );
}
