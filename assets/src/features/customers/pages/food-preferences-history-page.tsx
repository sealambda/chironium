import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import {
  fetchDietObservationsList,
  type ObservationItem,
} from "@/features/customers/api/observations-api";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.food-preferences";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "\u2014";
  }
  return format(new Date(value), "PP", { locale: getDateLocale() });
}

function getDietTypeLabel(codeText: string | null | undefined): string {
  if (codeText === "diet-inclusion") {
    return m.food_preferences_includes_label();
  }
  if (codeText === "diet-exclusion") {
    return m.food_preferences_avoids_label();
  }
  return codeText ?? "\u2014";
}

const columns: ColumnDef<ObservationItem, unknown>[] = [
  {
    id: "date",
    accessorKey: "effectiveDateTime",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.food_preferences_history_col_date()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatDate(getValue() as string | null),
    sortingFn: "datetime",
  },
  {
    id: "type",
    accessorFn: (row) => getDietTypeLabel(row.code?.text),
    header: ({ column }) => (
      <SortableHeader column={column}>{m.food_preferences_history_col_type()}</SortableHeader>
    ),
  },
  {
    id: "items",
    accessorKey: "valueString",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.food_preferences_history_col_items()}</SortableHeader>
    ),
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      return <span>{value ?? "\u2014"}</span>;
    },
  },
];

export function FoodPreferencesHistoryPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();

  useDetailModeEffect(<HistoryDetailHeader customerId={customerId} />, "food-preferences-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "dietObservationsList", selectedOrg?.id],
    queryFn: () => fetchDietObservationsList(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <h1 className="font-semibold text-lg">{m.food_preferences_history_title()}</h1>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          sorting={[{ id: "date", desc: true }]}
          pinFirstColumn
        />
      )}
    </div>
  );
}
