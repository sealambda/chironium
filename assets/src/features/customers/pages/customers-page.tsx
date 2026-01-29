import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useOrg } from "@/features/org/hooks/use-org";
import { fetchCustomerList } from "../api/customers-api";
import { useCustomersStore } from "../store/customers-store";
import { CustomerSheet } from "../ui/create-customer-sheet";
import { type Customer, CustomerCard } from "../ui/customer-card";

/** Stable empty array to avoid infinite loops in selectors */
const EMPTY_CUSTOMERS: Customer[] = [];

/**
 * Customers page displaying a scrollable list of customer cards.
 */
export function CustomersPage() {
  const { selectedOrg } = useOrg();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const {
    data: apiCustomers = [],
    isLoading,
    error,
  } = useQuery<Customer[]>({
    queryKey: ["customers", "list", selectedOrg?.id],
    queryFn: () => fetchCustomerList(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
  });

  // Get locally-created customers from the store.
  // Use stable EMPTY_CUSTOMERS reference to avoid infinite re-render loops.
  const localCustomers = useCustomersStore((state) =>
    selectedOrg ? state.getCustomers(selectedOrg.id) : EMPTY_CUSTOMERS,
  );

  // Merge API customers with local (mock) customers.
  const customers = useMemo(
    () => [...apiCustomers, ...localCustomers],
    [apiCustomers, localCustomers],
  );

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
      <header className="flex items-baseline justify-between">
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
            <CustomerCard
              key={customer.id}
              customer={customer}
              onClick={() => setEditingCustomer(customer)}
            />
          ))}
        </div>
      )}

      {/* Edit customer sheet */}
      <CustomerSheet
        open={editingCustomer !== null}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer ?? undefined}
      />
    </div>
  );
}
