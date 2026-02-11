import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";

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
} from "../hooks/use-detail-mutations";
import { CustomerDetailHeader } from "../ui/detail/customer-detail-header";
import { AddEntrySheet } from "../ui/forms/add-entry-sheet";
import { BodyMetricsForm } from "../ui/forms/body-metrics-form";
import { CycleForm } from "../ui/forms/cycle-form";
import { NutritionForm } from "../ui/forms/nutrition-form";
import { PathologyForm } from "../ui/forms/pathology-form";
import { SubscriptionForm } from "../ui/forms/subscription-form";
import { CustomerDetailDesktop } from "./customer-detail-desktop";
import { CustomerDetailMobile } from "./customer-detail-mobile";
import type { EntryType } from "./types";

type SheetType = EntryType | null;

const ENTRY_FORM_ID = "add-entry-form";

/** Uses detail mode to replace standard navigation with a custom header. */
export function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

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
  const createNutritionPlan = useCreateNutritionPlan(customerId);
  const createSubscription = useCreateSubscription(customerId);
  const createPathology = useCreatePathology(customerId);
  const createCycle = useCreateCycle(customerId);
  const pauseSubscription = usePauseSubscription(customerId);
  const cancelSubscription = useCancelSubscription(customerId);

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
        <CustomerDetailMobile customer={customer} detail={detail} onOpenSheet={setActiveSheet} />
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
        title={m.sheet_add_body_metrics_title()}
        description={m.sheet_add_body_metrics_desc()}
        open={activeSheet === "bodyMetrics"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createBodyMetrics.isPending}
      >
        <BodyMetricsForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createBodyMetrics.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={m.sheet_add_nutrition_title()}
        description={m.sheet_add_nutrition_desc()}
        open={activeSheet === "nutrition"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createNutritionPlan.isPending}
      >
        <NutritionForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createNutritionPlan.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={m.sheet_add_pathology_title()}
        description={m.sheet_add_pathology_desc()}
        open={activeSheet === "pathologies"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createPathology.isPending}
      >
        <PathologyForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createPathology.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={m.sheet_add_cycle_title()}
        description={m.sheet_add_cycle_desc()}
        open={activeSheet === "cycle"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createCycle.isPending}
      >
        <CycleForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createCycle.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>
    </div>
  );
}
