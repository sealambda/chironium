import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import {
  type AllergyIntoleranceItem,
  fetchAllergyIntolerances,
} from "@/features/customers/api/allergy-intolerance-api";
import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.allergies";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { Skeleton } from "@/shared/ui/skeleton";

function getAllergyTypeLabel(type: string): string {
  if (type === "ALLERGY") {
    return m.allergy_intolerance_type_allergy();
  }
  if (type === "INTOLERANCE") {
    return m.allergy_intolerance_type_intolerance();
  }
  return type;
}

function formatStatus(status: string | null | undefined): string {
  if (!status) {
    return "\u2014";
  }
  return status.charAt(0) + status.slice(1).toLowerCase();
}

const columns: ColumnDef<AllergyIntoleranceItem, unknown>[] = [
  {
    id: "type",
    accessorFn: (row) => getAllergyTypeLabel(row.type ?? ""),
    header: ({ column }) => (
      <SortableHeader column={column}>{m.allergy_intolerance_history_col_type()}</SortableHeader>
    ),
  },
  {
    id: "items",
    accessorFn: (row) => row.code?.text ?? row.code?.coding?.[0]?.display ?? "—",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.allergy_intolerance_history_col_items()}</SortableHeader>
    ),
    cell: ({ getValue }) => <span>{getValue() as string}</span>,
  },
  {
    id: "status",
    accessorFn: (row) => formatStatus(row.clinicalStatus),
    header: ({ column }) => (
      <SortableHeader column={column}>{m.allergy_intolerance_history_col_status()}</SortableHeader>
    ),
  },
];

export function AllergyIntoleranceHistoryPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const { patientId } = usePersonDetail(customerId);

  useDetailModeEffect(<HistoryDetailHeader customerId={customerId} />, "allergies-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "allergyIntolerances", selectedOrg?.id],
    queryFn: () => fetchAllergyIntolerances(patientId ?? "", selectedOrg?.id ?? ""),
    enabled: Boolean(patientId && selectedOrg?.id),
  });

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <h1 className="font-semibold text-lg">{m.allergy_intolerance_history_title()}</h1>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={data ?? []} pinFirstColumn />
      )}
    </div>
  );
}
