import { useState } from "react";

import type { useCustomerDetail } from "../hooks/use-customer-detail";
import type { Customer } from "../ui/customer-card";
import { CompactBodyMetricsCard } from "../ui/detail/compact-body-metrics-card";
import { CompactCycleCard } from "../ui/detail/compact-cycle-card";
import { CompactNutritionCard } from "../ui/detail/compact-nutrition-card";
import { CompactPathologiesCard } from "../ui/detail/compact-pathologies-card";
import { CompactSubscriptionCard } from "../ui/detail/compact-subscription-card";
import { CustomerProfileSection } from "../ui/detail/customer-profile-section";
import { BodyMetricsDrawer } from "../ui/drawers/body-metrics-drawer";
import { CycleDrawer } from "../ui/drawers/cycle-drawer";
import { NutritionDrawer } from "../ui/drawers/nutrition-drawer";
import { PathologiesDrawer } from "../ui/drawers/pathologies-drawer";
import { SubscriptionDrawer } from "../ui/drawers/subscription-drawer";
import type { EntryType } from "./types";

type DrawerType = EntryType | null;

interface CustomerDetailMobileProps {
  customer: Customer;
  detail: ReturnType<typeof useCustomerDetail>;
  onOpenSheet: (type: EntryType) => void;
}

export function CustomerDetailMobile({
  customer,
  detail,
  onOpenSheet,
}: Readonly<CustomerDetailMobileProps>) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);

  const {
    currentSubscription,
    latestBodyMetrics,
    activeNutritionPlan,
    lastCycle,
    activePathologies,
    subscriptions,
    bodyMetrics,
    nutritionPlans,
    cycleHistory,
    pathologies,
    hasCycleTracking,
  } = detail;

  return (
    <div className="space-y-4">
      <CustomerProfileSection customer={customer} />

      <CompactSubscriptionCard
        subscription={currentSubscription}
        onClick={() => setActiveDrawer("subscription")}
        isLoading={subscriptions.isLoading}
      />

      <div className="grid grid-cols-2 gap-3">
        <CompactBodyMetricsCard
          metrics={latestBodyMetrics}
          onClick={() => setActiveDrawer("bodyMetrics")}
          isLoading={bodyMetrics.isLoading}
        />
        <CompactNutritionCard
          plan={activeNutritionPlan}
          onClick={() => setActiveDrawer("nutrition")}
          isLoading={nutritionPlans.isLoading}
        />
        <CompactPathologiesCard
          pathologies={pathologies.data ?? []}
          activeCount={activePathologies.length}
          onClick={() => setActiveDrawer("pathologies")}
          isLoading={pathologies.isLoading}
        />
        {hasCycleTracking ? (
          <CompactCycleCard
            cycle={lastCycle}
            onClick={() => setActiveDrawer("cycle")}
            isLoading={cycleHistory.isLoading}
          />
        ) : null}
      </div>

      <SubscriptionDrawer
        isOpen={activeDrawer === "subscription"}
        onClose={() => setActiveDrawer(null)}
        data={subscriptions.data ?? []}
        onAdd={() => onOpenSheet("subscription")}
      />
      <BodyMetricsDrawer
        isOpen={activeDrawer === "bodyMetrics"}
        onClose={() => setActiveDrawer(null)}
        data={bodyMetrics.data ?? []}
        onAdd={() => onOpenSheet("bodyMetrics")}
      />
      <NutritionDrawer
        isOpen={activeDrawer === "nutrition"}
        onClose={() => setActiveDrawer(null)}
        data={nutritionPlans.data ?? []}
        onAdd={() => onOpenSheet("nutrition")}
      />
      <CycleDrawer
        isOpen={activeDrawer === "cycle"}
        onClose={() => setActiveDrawer(null)}
        data={cycleHistory.data ?? []}
        onAdd={() => onOpenSheet("cycle")}
      />
      <PathologiesDrawer
        isOpen={activeDrawer === "pathologies"}
        onClose={() => setActiveDrawer(null)}
        data={pathologies.data ?? []}
        onAdd={() => onOpenSheet("pathologies")}
      />
    </div>
  );
}
