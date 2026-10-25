import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2, CreditCard, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { fetchSubscriptionPlans } from "@/features/customers/api/subscriptions-api";
import { fetchOrganizationSettings } from "@/features/org/api/org-api";
import { AddSubscriptionPlanDialog } from "@/features/org/ui/add-subscription-plan-dialog";
import {
  formatSubscriptionPlanDurationText,
  formatSubscriptionPlanPriceText,
} from "@/features/org/ui/subscription-plan-columns";
import { SubscriptionPlansTable } from "@/features/org/ui/subscription-plans-table";
import { canManageOrgMembers } from "@/features/org/utils/settings-member-table-model";
import * as m from "@/paraglide/messages";
import { useCurrentUser } from "@/shared/session/use-current-user";
import { useOrg } from "@/shared/session/use-org";
import type { SubscriptionPlan } from "@/shared/types/subscriptions";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Loading } from "@/shared/ui/loading";
import { orgSettingsQueryKey, subscriptionPlansQueryKey } from "@/shared/utils/query-keys";

/**
 * Lists subscription plans for the selected organization with a desktop table
 * and mobile cards, matching the customers list layout.
 */
export function SubscriptionsPage() {
  const { user: currentUser } = useCurrentUser();
  const { selectedOrg, loading: orgsLoading } = useOrg();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: organizationSettings } = useQuery({
    queryKey: orgSettingsQueryKey(selectedOrg?.id ?? ""),
    queryFn: () => fetchOrganizationSettings(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg?.id),
  });

  const canAddPlans = useMemo(
    () => canManageOrgMembers(organizationSettings, currentUser?.id),
    [organizationSettings, currentUser?.id],
  );

  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
  } = useQuery({
    queryKey: subscriptionPlansQueryKey(selectedOrg?.id ?? ""),
    queryFn: () => fetchSubscriptionPlans(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
    placeholderData: (previousData) => previousData,
  });

  const invalidatePlans = () =>
    queryClient.invalidateQueries({
      queryKey: subscriptionPlansQueryKey(selectedOrg?.id ?? ""),
    });

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
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl leading-9 font-bold tracking-wide text-foreground uppercase">
            {m.subscriptions_title()}
          </h1>
          <span className="text-sm text-muted-foreground">({plans.length})</span>
        </div>
        {canAddPlans ? (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" data-icon="inline-start" />
            <span className="sr-only sm:not-sr-only">{m.subscriptions_add_plan()}</span>
          </Button>
        ) : null}
      </header>

      <PlanList items={plans} canAddPlans={canAddPlans} onAdd={() => setAddOpen(true)} />

      {canAddPlans ? (
        <AddSubscriptionPlanDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          organizationId={selectedOrg.id}
          onCreated={invalidatePlans}
        />
      ) : null}
    </div>
  );
}

function PlanList({
  items,
  canAddPlans,
  onAdd,
}: Readonly<{
  items: SubscriptionPlan[];
  canAddPlans: boolean;
  onAdd: () => void;
}>) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title={m.subscriptions_empty()}
        description={m.subscriptions_empty_desc()}
        actions={
          canAddPlans
            ? [
                {
                  label: m.subscriptions_add_plan(),
                  onAction: onAdd,
                },
              ]
            : []
        }
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
            <p className="text-sm text-muted-foreground">
              {formatSubscriptionPlanDurationText(plan)}
            </p>
            <p className="text-sm text-muted-foreground">{formatSubscriptionPlanPriceText(plan)}</p>
          </div>
        ))}
      </div>

      <div className="hidden lg:block">
        <SubscriptionPlansTable items={items} />
      </div>
    </div>
  );
}
