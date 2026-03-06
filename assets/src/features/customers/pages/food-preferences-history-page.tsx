import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import {
  type FoodPreferenceHistoryItem,
  fetchFoodPreferencesHistory,
} from "@/features/customers/api/food-preferences-api";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.food-preferences";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
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

function getDietTypeLabel(type: FoodPreferenceHistoryItem["type"]): string {
  if (type === "inclusion") {
    return m.food_preferences_includes_label();
  }
  return m.food_preferences_avoids_label();
}

const columns: ColumnDef<FoodPreferenceHistoryItem, unknown>[] = [
  {
    id: "date",
    accessorKey: "date",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.food_preferences_history_col_date()}</SortableHeader>
    ),
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap">{formatDate(getValue() as string | null)}</span>
    ),
    sortingFn: "datetime",
  },
  {
    id: "type",
    accessorFn: (row) => getDietTypeLabel(row.type),
    header: ({ column }) => (
      <SortableHeader column={column}>{m.food_preferences_history_col_type()}</SortableHeader>
    ),
    cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue() as string}</span>,
  },
  {
    id: "items",
    accessorKey: "items",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.food_preferences_history_col_items()}</SortableHeader>
    ),
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span>{value || "\u2014"}</span>;
    },
  },
  {
    id: "notes",
    cell: ({ row }) => <NotesPopover notes={row.original.notes} />,
    enableSorting: false,
  },
];

export function FoodPreferencesHistoryPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();

  useDetailModeEffect(<HistoryDetailHeader customerId={customerId} />, "food-preferences-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "foodPreferencesHistory", selectedOrg?.id],
    queryFn: () => fetchFoodPreferencesHistory(customerId, selectedOrg?.id ?? ""),
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
          getRowId={(row) => row.id}
          pinFirstColumn
        />
      )}
    </div>
  );
}
