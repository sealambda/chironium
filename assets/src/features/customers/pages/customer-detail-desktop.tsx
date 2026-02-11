import type { ColumnDef } from "@tanstack/react-table";

import type {
  BodyMetricsRecord,
  CycleRecord,
  NutritionPlanRecord,
  PathologyRecord,
} from "@/mocks/types";
import * as m from "@/paraglide/messages";
import {
  BarChartSkeleton,
  CircularChartSkeleton,
  LineChartSkeleton,
} from "@/shared/ui/chart-skeleton";
import { DataTable } from "@/shared/ui/data-table";

import type { useCustomerDetail } from "../hooks/use-customer-detail";
import { renderBodyMetricsExpandedRow, renderCycleExpandedRow } from "../hooks/use-detail-columns";
import type { Customer } from "../ui/customer-card";
import { CustomerProfileCard } from "../ui/detail/customer-profile-card";
import { DesktopSubscriptionCard } from "../ui/detail/desktop-subscription-card";
import { DetailSection } from "../ui/detail/detail-section";
import type { EntryType } from "./types";

interface CustomerDetailDesktopProps {
  customer: Customer;
  detail: ReturnType<typeof useCustomerDetail>;
  bodyMetricsColumns: ColumnDef<BodyMetricsRecord, unknown>[];
  nutritionColumns: ColumnDef<NutritionPlanRecord, unknown>[];
  pathologyColumns: ColumnDef<PathologyRecord, unknown>[];
  cycleColumns: ColumnDef<CycleRecord, unknown>[];
  onOpenSheet: (type: EntryType) => void;
  onPauseSubscription: () => void;
  onCancelSubscription: () => void;
  isPauseToggling: boolean;
  isCancelling: boolean;
}

export function CustomerDetailDesktop({
  customer,
  detail,
  bodyMetricsColumns,
  nutritionColumns,
  pathologyColumns,
  cycleColumns,
  onOpenSheet,
  onPauseSubscription,
  onCancelSubscription,
  isPauseToggling,
  isCancelling,
}: Readonly<CustomerDetailDesktopProps>) {
  const {
    currentSubscription,
    subscriptions,
    bodyMetrics,
    nutritionPlans,
    pathologies,
    cycleHistory,
    hasCycleTracking,
  } = detail;

  const emptyState = (
    <div className="py-8 text-center text-muted-foreground text-sm">{m.empty_no_data()}</div>
  );

  return (
    <div className="space-y-6">
      <CustomerProfileCard customer={customer} />
      <DesktopSubscriptionCard
        subscription={currentSubscription}
        isLoading={subscriptions.isLoading}
        onAdd={() => onOpenSheet("subscription")}
        onPauseToggle={onPauseSubscription}
        onCancel={onCancelSubscription}
        isPauseToggling={isPauseToggling}
        isCancelling={isCancelling}
      />

      <div className="grid grid-cols-2 gap-6">
        <DetailSection
          title={m.section_body_metrics()}
          chartPlaceholder={<LineChartSkeleton />}
          onAdd={() => onOpenSheet("bodyMetrics")}
          addButtonLabel={m.sheet_add_body_metrics_title()}
          isLoading={bodyMetrics.isLoading}
          className="border-border/30 bg-blue-50/50"
          addButtonClassName="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
        >
          <DataTable
            columns={bodyMetricsColumns}
            data={bodyMetrics.data ?? []}
            getRowId={(row) => row.id}
            renderExpandedRow={renderBodyMetricsExpandedRow}
            emptyState={emptyState}
          />
        </DetailSection>

        <DetailSection
          title={m.section_nutrition()}
          chartPlaceholder={<BarChartSkeleton />}
          onAdd={() => onOpenSheet("nutrition")}
          addButtonLabel={m.sheet_add_nutrition_title()}
          isLoading={nutritionPlans.isLoading}
          className="border-border/30 bg-emerald-50/50"
          addButtonClassName="border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white"
        >
          <DataTable
            columns={nutritionColumns}
            data={nutritionPlans.data ?? []}
            getRowId={(row) => row.id}
            emptyState={emptyState}
          />
        </DetailSection>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <DetailSection
          title={m.section_pathologies()}
          chartPlaceholder={<CircularChartSkeleton />}
          onAdd={() => onOpenSheet("pathologies")}
          addButtonLabel={m.sheet_add_pathology_title()}
          isLoading={pathologies.isLoading}
          className="border-border/30 bg-amber-50/50"
          addButtonClassName="border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
        >
          <DataTable
            columns={pathologyColumns}
            data={pathologies.data ?? []}
            getRowId={(row) => row.id}
            emptyState={emptyState}
          />
        </DetailSection>

        {hasCycleTracking ? (
          <DetailSection
            title={m.section_cycle()}
            chartPlaceholder={<LineChartSkeleton />}
            onAdd={() => onOpenSheet("cycle")}
            addButtonLabel={m.sheet_add_cycle_title()}
            isLoading={cycleHistory.isLoading}
            className="border-border/30 bg-pink-50/50"
            addButtonClassName="border-pink-500 text-pink-600 hover:bg-pink-500 hover:text-white"
          >
            <DataTable
              columns={cycleColumns}
              data={cycleHistory.data ?? []}
              getRowId={(row) => row.id}
              renderExpandedRow={renderCycleExpandedRow}
              emptyState={emptyState}
            />
          </DetailSection>
        ) : null}
      </div>
    </div>
  );
}
