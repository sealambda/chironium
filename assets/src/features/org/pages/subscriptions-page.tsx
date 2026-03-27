import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2, CreditCard, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchSubscriptionPlans } from "@/features/customers/api/subscriptions-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { AddSubscriptionPlanDialog } from "@/features/org/ui/add-subscription-plan-dialog";
import {
  formatSubscriptionPlanDurationText,
  formatSubscriptionPlanPriceText,
} from "@/features/org/ui/subscription-plan-columns";
import { SubscriptionPlansTable } from "@/features/org/ui/subscription-plans-table";
import * as m from "@/paraglide/messages";
import { useDetailMode } from "@/shared/layout/detail-context";
import type { SubscriptionPlan } from "@/shared/types/subscriptions";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Loading } from "@/shared/ui/loading";

const PLANS_QUERY_KEY = "subscription-plans";

/**
 * Lists subscription plans for the selected organization with a desktop table
 * and mobile cards, matching the customers list layout.
 */
export function SubscriptionsPage() {
  const { selectedOrg, loading: orgsLoading } = useOrg();
  const { setHeaderContent } = useDetailMode();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
  } = useQuery({
    queryKey: [PLANS_QUERY_KEY, selectedOrg?.id],
    queryFn: () => fetchSubscriptionPlans(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
    placeholderData: (previousData) => previousData,
  });

  const invalidatePlans = () => {
    void queryClient.invalidateQueries({ queryKey: [PLANS_QUERY_KEY, selectedOrg?.id] });
  };

  useEffect(() => {
    if (!selectedOrg || plansLoading || Boolean(plansError)) {
      setHeaderContent(null);
      return;
    }

    setHeaderContent(
      <div className="ml-auto flex w-full items-center justify-end gap-3">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" data-icon="inline-start" />
          <span className="hidden md:inline">{m.subscriptions_add_plan()}</span>
        </Button>
      </div>,
    );

    return () => {
      setHeaderContent(null);
    };
  }, [plansError, plansLoading, selectedOrg, setHeaderContent]);

  if (orgsLoading || plansLoading) {
    return <Loading />;
  }

  if (!selectedOrg) {
    return <EmptyState icon={Building2} title={m.no_org()} description={m.no_org_desc()} />;
  }

  if (plansError) {
    const message = plansError instanceof Error ? plansError.message : String(plansError);
    return <EmptyState icon={AlertCircle} title={m.subscriptions_error()} description={message} />;
  }

  return (
    <div className="space-y-4 pt-7">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-bold text-2xl text-foreground uppercase tracking-wide">
            {m.subscriptions_title()}
          </h1>
          <span className="text-muted-foreground text-sm">({plans.length})</span>
        </div>
      </header>

      <PlanList items={plans} onAdd={() => setAddOpen(true)} />

      <AddSubscriptionPlanDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        organizationId={selectedOrg.id}
        onCreated={invalidatePlans}
      />
    </div>
  );
}

function PlanList({
  items,
  onAdd,
}: Readonly<{
  items: SubscriptionPlan[];
  onAdd: () => void;
}>) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title={m.subscriptions_empty()}
        description={m.subscriptions_empty_desc()}
        actionLabel={m.subscriptions_add_plan()}
        onAction={onAdd}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 lg:hidden">
        {items.map((plan) => (
          <div
            key={plan.id}
            className="rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm"
          >
            <p className="font-medium">{plan.name ?? "—"}</p>
            <p className="text-muted-foreground text-sm">
              {formatSubscriptionPlanDurationText(plan)}
            </p>
            <p className="text-muted-foreground text-sm">{formatSubscriptionPlanPriceText(plan)}</p>
          </div>
        ))}
      </div>

      <div className="hidden lg:block">
        <SubscriptionPlansTable items={items} />
      </div>
    </div>
  );
}
