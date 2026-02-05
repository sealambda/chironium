import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { fetchCustomerList } from "../api/customers-api";
import { CustomerSheet } from "../ui/create-customer-sheet";
import { type Customer, CustomerCard } from "../ui/customer-card";

/**
 * Customers page displaying a scrollable list of customer cards.
 */
export function CustomersPage() {
  const { selectedOrg } = useOrg();
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);

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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">
            {m.customers_no_org()}
          </div>
          <div className="text-muted-foreground text-sm">
            {m.customers_no_org_desc()}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">
            {m.common_loading()}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch customers";
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">
            {m.customers_error()}
          </div>
          <div className="text-muted-foreground text-sm">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Page header with action button. */}
      <header className="flex items-center justify-between">
        <h1 className="font-bold text-2xl text-foreground uppercase tracking-wide">
          {m.customers_title()}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {customers.length} {m.customers_total()}
          </span>
          {/* Add button - icon only on mobile (44px touch target), icon + text on md+ */}
          <Button
            variant="ghost"
            onClick={() => setIsCreateCustomerOpen(true)}
            className="size-11 md:hidden"
            aria-label={m.customers_add()}
          >
            <UserPlus className="size-5" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsCreateCustomerOpen(true)}
            className="hidden md:flex"
          >
            <UserPlus className="h-4 w-4" />
            {m.customers_add()}
          </Button>
        </div>
      </header>

      {/* Customer cards list. */}
      {customers.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border/50 border-dashed bg-card/50">
          <div className="text-center">
            <div className="mb-2 font-medium text-muted-foreground">
              {m.customers_empty()}
            </div>
            <div className="text-muted-foreground text-sm">
              {m.customers_empty_desc()}
            </div>
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

      {/* Create customer sheet */}
      <CustomerSheet
        open={isCreateCustomerOpen}
        onOpenChange={setIsCreateCustomerOpen}
      />
    </div>
  );
}
