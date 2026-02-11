import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import type {
  BodyMetricsRecord,
  CycleRecord,
  NutritionPlanRecord,
  PathologyRecord,
} from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";
import { heightMetersToCm } from "@/shared/utils/measurement-utils";

import { fetchCustomerList } from "../api/customers-api";
import { useCustomerDetail } from "../hooks/use-customer-detail";
import {
  useBodyMetricsColumns,
  useCycleColumns,
  useNutritionColumns,
  usePathologyColumns,
} from "../hooks/use-detail-columns";
import {
  useCancelSubscription,
  useCreateBodyMetrics,
  useCreateCycle,
  useCreateNutritionPlan,
  useCreatePathology,
  useCreateSubscription,
  usePauseSubscription,
  useUpdateBodyMetrics,
  useUpdateCycle,
  useUpdateNutritionPlan,
  useUpdatePathology,
} from "../hooks/use-detail-mutations";
import type {
  BodyMetricsFormData,
  CycleFormData,
  NutritionPlanFormData,
  PathologyFormData,
} from "../model/detail-schemas";
import { CustomerDetailHeader } from "../ui/detail/customer-detail-header";
import { AddEntrySheet } from "../ui/forms/add-entry-sheet";
import { BodyMetricsForm } from "../ui/forms/body-metrics-form";
import { CycleForm } from "../ui/forms/cycle-form";
import { NutritionForm } from "../ui/forms/nutrition-form";
import { PathologyForm } from "../ui/forms/pathology-form";
import { SubscriptionForm } from "../ui/forms/subscription-form";
import { CustomerDetailDesktop } from "./customer-detail-desktop";
import { CustomerDetailMobile } from "./customer-detail-mobile";
import type { EditingRecord, EntryType } from "./types";

type SheetType = EntryType | null;

const ENTRY_FORM_ID = "add-entry-form";

function toBodyMetricsFormValues(record: BodyMetricsRecord): BodyMetricsFormData {
  return {
    date: new Date(record.date),
    weight: record.weight,
    heightCm: heightMetersToCm(record.heightM),
    chest: record.measurements.chest,
    waist: record.measurements.waist,
    hip: record.measurements.hip,
    biceps: record.measurements.biceps,
    quadriceps: record.measurements.quadriceps,
  };
}

function toNutritionFormValues(record: NutritionPlanRecord): NutritionPlanFormData {
  return {
    startDate: new Date(record.startDate),
    endDate: record.endDate ? new Date(record.endDate) : undefined,
    kcal: record.kcal,
    protein: record.protein,
    carbs: record.carbs,
    fat: record.fat,
  };
}

function toPathologyFormValues(record: PathologyRecord): PathologyFormData {
  return {
    pathologyId: record.pathologyId,
    pathologyName: record.pathologyName,
    isChronic: record.status === "chronic",
    diagnosedDate: record.diagnosedDate ? new Date(record.diagnosedDate) : undefined,
    diagnosedDateUnknown: record.diagnosedDateUnknown ?? false,
    resolvedDate: record.resolvedDate ? new Date(record.resolvedDate) : undefined,
    resolvedDateUnknown: record.resolvedDateUnknown ?? false,
    notes: record.notes ?? "",
  };
}

function toCycleFormValues(record: CycleRecord): CycleFormData {
  return {
    startDate: new Date(record.startDate),
    endDate: record.endDate ? new Date(record.endDate) : undefined,
    cycleLength: record.cycleLength,
    symptoms: record.symptoms,
  };
}

/** Uses detail mode to replace standard navigation with a custom header. */
export function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null);

  // Likely cached from the customers list page.
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "list", selectedOrg?.id],
    queryFn: () => fetchCustomerList(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
  });

  const customer = customers.find((c) => c.id === customerId);
  const detail = useCustomerDetail(customerId);

  const bodyMetricsColumns = useBodyMetricsColumns();
  const nutritionColumns = useNutritionColumns();
  const pathologyColumns = usePathologyColumns();
  const cycleColumns = useCycleColumns();

  const createBodyMetrics = useCreateBodyMetrics(customerId);
  const updateBodyMetrics = useUpdateBodyMetrics(customerId);
  const createNutritionPlan = useCreateNutritionPlan(customerId);
  const updateNutritionPlan = useUpdateNutritionPlan(customerId);
  const createSubscription = useCreateSubscription(customerId);
  const createPathology = useCreatePathology(customerId);
  const updatePathology = useUpdatePathology(customerId);
  const createCycle = useCreateCycle(customerId);
  const updateCycle = useUpdateCycle(customerId);
  const pauseSubscription = usePauseSubscription(customerId);
  const cancelSubscription = useCancelSubscription(customerId);

  const handleEditRecord = useCallback((editing: NonNullable<EditingRecord>) => {
    setEditingRecord(editing);
    setActiveSheet(editing.type);
  }, []);

  const closeEditSheet = useCallback(() => {
    setActiveSheet(null);
    setEditingRecord(null);
  }, []);

  const editingBodyMetric =
    editingRecord?.type === "bodyMetrics" ? editingRecord.record : null;
  const editingNutritionPlan =
    editingRecord?.type === "nutrition" ? editingRecord.record : null;
  const editingPathology =
    editingRecord?.type === "pathologies" ? editingRecord.record : null;
  const editingCycle =
    editingRecord?.type === "cycle" ? editingRecord.record : null;

  useDetailModeEffect(<CustomerDetailHeader />, "customer-detail");

  if (detail.isLoading && !customer) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">{m.common_loading()}</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">{m.customer_not_found()}</div>
          <div className="text-muted-foreground text-sm">{m.customer_not_found_desc()}</div>
        </div>
        <Link to="/customers">
          <Button variant="outline">{m.customer_back()}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <div className="hidden lg:block">
        <CustomerDetailDesktop
          customer={customer}
          detail={detail}
          bodyMetricsColumns={bodyMetricsColumns}
          nutritionColumns={nutritionColumns}
          pathologyColumns={pathologyColumns}
          cycleColumns={cycleColumns}
          onOpenSheet={setActiveSheet}
          onEditRecord={handleEditRecord}
          onPauseSubscription={() => {
            if (detail.currentSubscription) {
              pauseSubscription.mutate(detail.currentSubscription.id);
            }
          }}
          onCancelSubscription={() => {
            if (detail.currentSubscription) {
              cancelSubscription.mutate(detail.currentSubscription.id);
            }
          }}
          isPauseToggling={pauseSubscription.isPending}
          isCancelling={cancelSubscription.isPending}
        />
      </div>

      <div className="lg:hidden">
        <CustomerDetailMobile
          customer={customer}
          detail={detail}
          onOpenSheet={setActiveSheet}
          onEditRecord={handleEditRecord}
        />
      </div>

      <AddEntrySheet
        title={m.sheet_add_subscription_title()}
        description={m.sheet_add_subscription_desc()}
        open={activeSheet === "subscription"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createSubscription.isPending}
      >
        <SubscriptionForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createSubscription.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={
          editingBodyMetric
            ? m.sheet_edit_body_metrics_title()
            : m.sheet_add_body_metrics_title()
        }
        description={
          editingBodyMetric
            ? m.sheet_edit_body_metrics_desc()
            : m.sheet_add_body_metrics_desc()
        }
        open={activeSheet === "bodyMetrics"}
        onOpenChange={(open) => !open && closeEditSheet()}
        formId={ENTRY_FORM_ID}
        isPending={editingBodyMetric ? updateBodyMetrics.isPending : createBodyMetrics.isPending}
      >
        <BodyMetricsForm
          key={editingBodyMetric?.id ?? "new"}
          id={ENTRY_FORM_ID}
          initialValues={editingBodyMetric ? toBodyMetricsFormValues(editingBodyMetric) : undefined}
          onSubmit={(data) => {
            if (editingBodyMetric) {
              updateBodyMetrics.mutate(
                { id: editingBodyMetric.id, data },
                { onSuccess: closeEditSheet },
              );
            } else {
              createBodyMetrics.mutate(data, { onSuccess: closeEditSheet });
            }
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={
          editingNutritionPlan
            ? m.sheet_edit_nutrition_title()
            : m.sheet_add_nutrition_title()
        }
        description={
          editingNutritionPlan
            ? m.sheet_edit_nutrition_desc()
            : m.sheet_add_nutrition_desc()
        }
        open={activeSheet === "nutrition"}
        onOpenChange={(open) => !open && closeEditSheet()}
        formId={ENTRY_FORM_ID}
        isPending={
          editingNutritionPlan ? updateNutritionPlan.isPending : createNutritionPlan.isPending
        }
      >
        <NutritionForm
          key={editingNutritionPlan?.id ?? "new"}
          id={ENTRY_FORM_ID}
          initialValues={
            editingNutritionPlan ? toNutritionFormValues(editingNutritionPlan) : undefined
          }
          onSubmit={(data) => {
            if (editingNutritionPlan) {
              updateNutritionPlan.mutate(
                { id: editingNutritionPlan.id, data },
                { onSuccess: closeEditSheet },
              );
            } else {
              createNutritionPlan.mutate(data, { onSuccess: closeEditSheet });
            }
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={
          editingPathology ? m.sheet_edit_pathology_title() : m.sheet_add_pathology_title()
        }
        description={
          editingPathology ? m.sheet_edit_pathology_desc() : m.sheet_add_pathology_desc()
        }
        open={activeSheet === "pathologies"}
        onOpenChange={(open) => !open && closeEditSheet()}
        formId={ENTRY_FORM_ID}
        isPending={editingPathology ? updatePathology.isPending : createPathology.isPending}
      >
        <PathologyForm
          key={editingPathology?.id ?? "new"}
          id={ENTRY_FORM_ID}
          initialValues={editingPathology ? toPathologyFormValues(editingPathology) : undefined}
          onSubmit={(data) => {
            if (editingPathology) {
              updatePathology.mutate(
                { id: editingPathology.id, data },
                { onSuccess: closeEditSheet },
              );
            } else {
              createPathology.mutate(data, { onSuccess: closeEditSheet });
            }
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={editingCycle ? m.sheet_edit_cycle_title() : m.sheet_add_cycle_title()}
        description={editingCycle ? m.sheet_edit_cycle_desc() : m.sheet_add_cycle_desc()}
        open={activeSheet === "cycle"}
        onOpenChange={(open) => !open && closeEditSheet()}
        formId={ENTRY_FORM_ID}
        isPending={editingCycle ? updateCycle.isPending : createCycle.isPending}
      >
        <CycleForm
          key={editingCycle?.id ?? "new"}
          id={ENTRY_FORM_ID}
          initialValues={editingCycle ? toCycleFormValues(editingCycle) : undefined}
          onSubmit={(data) => {
            if (editingCycle) {
              updateCycle.mutate(
                { id: editingCycle.id, data },
                { onSuccess: closeEditSheet },
              );
            } else {
              createCycle.mutate(data, { onSuccess: closeEditSheet });
            }
          }}
        />
      </AddEntrySheet>
    </div>
  );
}
