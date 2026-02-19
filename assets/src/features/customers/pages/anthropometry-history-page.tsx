import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import {
  type AnthropometricSnapshot,
  fetchAnthropometryHistory,
} from "@/features/customers/api/anthropometry-api";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.anthropometry";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";

function formatDate(value: string): string {
  if (!value) {
    return "\u2014";
  }
  return format(new Date(value), "PP", { locale: getDateLocale() });
}

function formatNumber(value: number | undefined): string {
  return value !== undefined ? String(value) : "\u2014";
}

const columns: ColumnDef<AnthropometricSnapshot, unknown>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.anthropometry_history_col_date()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatDate(getValue() as string),
    sortingFn: "datetime",
  },
  {
    accessorKey: "weight",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.anthropometry_history_col_weight()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
  },
  {
    accessorKey: "height",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.anthropometry_history_col_height()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
  },
  {
    accessorKey: "bmi",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.anthropometry_history_col_bmi()}</SortableHeader>
    ),
    cell: ({ getValue }) => {
      const v = getValue() as number | undefined;
      return v !== undefined ? v.toFixed(1) : "\u2014";
    },
  },
  {
    accessorKey: "chest",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.anthropometry_history_col_chest()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
  },
  {
    accessorKey: "waist",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.anthropometry_history_col_waist()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
  },
  {
    accessorKey: "hip",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.anthropometry_history_col_hip()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
  },
  {
    accessorKey: "arm",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.anthropometry_history_col_arm()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
  },
  {
    accessorKey: "thigh",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.anthropometry_history_col_thigh()}</SortableHeader>
    ),
    cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
  },
];

export function AnthropometryHistoryPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();

  useDetailModeEffect(<HistoryDetailHeader customerId={customerId} />, "anthropometry-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "anthropometryHistory", selectedOrg?.id],
    queryFn: () => fetchAnthropometryHistory(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <h1 className="font-semibold text-lg">{m.anthropometry_history_title()}</h1>
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
