import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Building2, Plus, Users } from "lucide-react";
import { useState } from "react";

import {
  fetchSubscriptionsWithPerson,
  type SubscriptionWithPerson,
} from "@/features/customers/api/subscriptions-api";
import { OnboardingDialog } from "@/features/customers/ui/onboarding/onboarding-dialog";
import { PersonCard } from "@/features/customers/ui/person-card";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

/**
 * Customers page displaying a scrollable list of customer cards.
 */
export function CustomersPage() {
  const { selectedOrg, loading: orgsLoading } = useOrg();
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery<SubscriptionWithPerson[]>({
    queryKey: ["customers", "list", selectedOrg?.id],
    queryFn: () => fetchSubscriptionsWithPerson(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
  });

  if (orgsLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">{m.common_loading()}</div>
        </div>
      </div>
    );
  }

  if (!selectedOrg) {
    return (
      <EmptyState
        icon={Building2}
        title={m.customers_no_org()}
        description={m.customers_no_org_desc()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">{m.common_loading()}</div>
        </div>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch customers";
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">{m.customers_error()}</div>
          <div className="text-muted-foreground text-sm">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-bold text-2xl text-foreground uppercase tracking-wide">
            {m.customers_title()}
          </h1>
          <span className="text-muted-foreground text-sm">({customers.length})</span>
        </div>
        <Button size="sm" onClick={() => setOnboardingOpen(true)}>
          <Plus className="size-4" data-icon="inline-start" />
          <span className="hidden sm:inline">{m.customer_add()}</span>
        </Button>
      </header>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={m.customers_empty()}
          description={m.customers_empty_desc()}
          actionLabel={m.customer_add()}
          onAction={() => setOnboardingOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {customers.map((item) => (
            <Link
              key={item.subscriber.id}
              to="/customers/$customerId"
              params={{ customerId: item.subscriber.id }}
              className="block"
            >
              <PersonCard item={item} />
            </Link>
          ))}
        </div>
      )}

      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </div>
  );
}
