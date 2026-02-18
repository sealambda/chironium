import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { fetchCustomerList } from "@/features/customers/api/customers-api";
import { type Customer, CustomerCard } from "@/features/customers/ui/customer-card";
import { OnboardingDialog } from "@/features/customers/ui/onboarding/onboarding-dialog";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";

/**
 * Customers page displaying a scrollable list of customer cards.
 */
export function CustomersPage() {
  const { selectedOrg } = useOrg();
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery<Customer[]>({
    queryKey: ["customers", "list", selectedOrg?.id],
    queryFn: () => fetchCustomerList(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
  });

  if (!selectedOrg) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">{m.customers_no_org()}</div>
          <div className="text-muted-foreground text-sm">{m.customers_no_org_desc()}</div>
        </div>
      </div>
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
          {m.customer_add()}
        </Button>
      </header>

      {customers.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border/50 border-dashed bg-card/50">
          <div className="text-center">
            <div className="mb-2 font-medium text-muted-foreground">{m.customers_empty()}</div>
            <div className="text-muted-foreground text-sm">{m.customers_empty_desc()}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              to="/customers/$customerId"
              params={{ customerId: customer.id }}
              className="block"
            >
              <CustomerCard customer={customer} />
            </Link>
          ))}
        </div>
      )}

      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </div>
  );
}
