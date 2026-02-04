import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useOrg } from "@/features/org/hooks/use-org";
import { useNavTrailingActions } from "@/shared/layout/detail-context";
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

  // Add create customer button to nav bar trailing slot.
  useNavTrailingActions(
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10"
      aria-label="Add customer"
      onClick={() => setIsCreateCustomerOpen(true)}
    >
      <UserPlus className="size-5" />
    </Button>,
    "create-customer",
  );

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
            No organisation selected
          </div>
          <div className="text-muted-foreground text-sm">
            Please select an organisation to view customers.
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
            Loading customers...
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
            Error loading customers
          </div>
          <div className="text-muted-foreground text-sm">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Page header. */}
      <header className="flex items-baseline gap-3">
        <h1 className="font-bold text-2xl text-foreground uppercase tracking-wide">
          Customers
        </h1>
        <span className="text-muted-foreground text-sm">
          {customers.length} total
        </span>
      </header>

      {/* Customer cards list. */}
      {customers.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border/50 border-dashed bg-card/50">
          <div className="text-center">
            <div className="mb-2 font-medium text-muted-foreground">
              No customers yet
            </div>
            <div className="text-muted-foreground text-sm">
              Customers will appear here once they are added.
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
