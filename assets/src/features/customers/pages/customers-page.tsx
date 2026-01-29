import { useQuery } from "@tanstack/react-query";
import { useOrg } from "@/features/org/hooks/use-org";
import { fetchCustomerList } from "../api/customers-api";
import { type Customer, CustomerCard } from "../ui/customer-card";

/**
 * Customers page displaying a scrollable list of customer cards.
 */
export function CustomersPage() {
  const { selectedOrg } = useOrg();
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
          <div className="mb-2 font-medium text-muted-foreground">No organisation selected</div>
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
          <div className="mb-2 font-medium text-muted-foreground">Loading customers...</div>
        </div>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch customers";
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">Error loading customers</div>
          <div className="text-muted-foreground text-sm">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Page header. */}
      <header className="flex items-baseline justify-between">
        <h1 className="font-bold text-2xl text-foreground uppercase tracking-wide">Customers</h1>
        <span className="text-muted-foreground text-sm">{customers.length} total</span>
      </header>

      {/* Customer cards list. */}
      {customers.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border/50 border-dashed bg-card/50">
          <div className="text-center">
            <div className="mb-2 font-medium text-muted-foreground">No customers yet</div>
            <div className="text-muted-foreground text-sm">
              Customers will appear here once they are added.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}
