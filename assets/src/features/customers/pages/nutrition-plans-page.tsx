import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import {
  selectAnthropometryHistory,
  selectCurrentStateSnapshot,
} from "@/features/customers/api/anthropometry-api";
import { nutritionPlanRecordedAt } from "@/features/customers/api/nutrition-plans-api";
import {
  fetchPatientDetail,
  type NutritionPlanRecord,
} from "@/features/customers/api/patients-api";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { NutritionPlanDetailDialog } from "@/features/customers/ui/detail/nutrition-plan-detail-dialog";
import { totalKcalFromMacroGrams } from "@/features/customers/ui/detail/nutrition-plan-utils";
import { NutritionRemoveDialog } from "@/features/customers/ui/detail/nutrition-remove-dialog";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.nutrition";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { Skeleton } from "@/shared/ui/skeleton";
import { personQueryKeys } from "@/shared/utils/query-keys";

function macroKcalOf(plan: NutritionPlanRecord): number {
  return totalKcalFromMacroGrams({
    protein: plan.proteinG,
    carbs: plan.carbsG,
    fat: plan.fatG,
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

export function NutritionPlansPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const organizationId = selectedOrg?.id ?? "";

  useDetailModeEffect(<HistoryDetailHeader />, "nutrition-plans");

  const { data, isLoading } = useQuery({
    queryKey: personQueryKeys.patientDetail(customerId, organizationId),
    queryFn: () => fetchPatientDetail(customerId, organizationId),
    enabled: Boolean(customerId && organizationId),
  });

  const [editingPlan, setEditingPlan] = useState<NutritionPlanRecord | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const plans = useMemo(
    () =>
      [...(data?.nutritionPlans ?? [])].sort((a, b) =>
        nutritionPlanRecordedAt(b).localeCompare(nutritionPlanRecordedAt(a)),
      ),
    [data?.nutritionPlans],
  );

  const currentAnthropometry = useMemo(
    () => selectCurrentStateSnapshot(selectAnthropometryHistory(data?.observations)),
    [data?.observations],
  );

  const columns = useMemo<ColumnDef<NutritionPlanRecord, unknown>[]>(
    () => [
      {
        id: "recordedAt",
        header: () => m.nutrition_plans_col_date(),
        cell: ({ row }) => formatDate(nutritionPlanRecordedAt(row.original)),
      },
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
      {
        id: "macroKcal",
        header: () => m.nutrition_plans_col_macros_kcal(),
        cell: ({ row }) => macroKcalOf(row.original).toLocaleString(),
      },
      {
        id: "delta",
        header: () => m.nutrition_plans_col_delta(),
        cell: ({ row }) => {
          const delta = macroKcalOf(row.original) - row.original.targetKcal;
          return `${delta > 0 ? "+" : ""}${delta}`;
        },
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={m.common_edit()}
              onClick={() => setEditingPlan(row.original)}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={m.common_delete()}
              onClick={() => setRemovingId(row.original.id)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  let content: ReactNode;
  if (isLoading) {
    content = (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  } else if (plans.length === 0) {
    content = <p className="text-muted-foreground text-sm">{m.nutrition_plans_empty()}</p>;
  } else {
    content = <DataTable columns={columns} data={plans} pinFirstColumn />;
  }

  return (
    <div className="flex flex-col gap-4 pt-4 lg:pt-6">
      <h1 className="font-semibold text-lg">{m.nutrition_plans_title()}</h1>
      {content}

      <NutritionPlanDetailDialog
        mode="edit"
        item={editingPlan ?? undefined}
        personId={customerId}
        patientId={data?.id ?? null}
        organizationId={organizationId}
        weightKg={currentAnthropometry?.weight ?? null}
        heightCm={currentAnthropometry?.height ?? null}
        dateOfBirth={data?.person?.birthDate ?? null}
        sex={data?.person?.gender ?? null}
        open={editingPlan !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPlan(null);
          }
        }}
        onRemoveClick={() => {
          setRemovingId(editingPlan?.id ?? null);
          setEditingPlan(null);
        }}
      />

      {removingId !== null ? (
        <NutritionRemoveDialog
          id={removingId}
          personId={customerId}
          organizationId={organizationId}
          open={removingId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setRemovingId(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
