import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import {
  fetchPatientDetail,
  type NutritionPlanRecord,
} from "@/features/customers/api/patients-api";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.nutrition";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { Skeleton } from "@/shared/ui/skeleton";
import { personQueryKeys } from "@/shared/utils/query-keys";

const columns: ColumnDef<NutritionPlanRecord, unknown>[] = [
  {
    accessorKey: "targetKcal",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.nutrition_plans_col_kcal()}</SortableHeader>
    ),
    cell: ({ getValue }) => (getValue() as number).toLocaleString(),
  },
  {
    accessorKey: "proteinG",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.nutrition_plans_col_protein()}</SortableHeader>
    ),
  },
  {
    accessorKey: "carbsG",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.nutrition_plans_col_carbs()}</SortableHeader>
    ),
  },
  {
    accessorKey: "fatG",
    header: ({ column }) => (
      <SortableHeader column={column}>{m.nutrition_plans_col_fat()}</SortableHeader>
    ),
  },
];

export function NutritionPlansPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();

  useDetailModeEffect(<HistoryDetailHeader />, "nutrition-plans");

  const { data, isLoading } = useQuery({
    queryKey: personQueryKeys.patientDetail(customerId, selectedOrg?.id ?? ""),
    queryFn: () => fetchPatientDetail(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  const plans = data?.nutritionPlans ?? [];

  return (
    <div className="flex flex-col gap-4 pt-4 lg:pt-6">
      <h1 className="font-semibold text-lg">{m.nutrition_plans_title()}</h1>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={plans} pinFirstColumn />
      )}
    </div>
  );
}
