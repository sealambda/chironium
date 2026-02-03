import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Building2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { CreateOrgModal } from "@/features/org/ui/create-org-modal";
import { useOrg } from "@/features/org/hooks/use-org";
import { AuthLoading } from "@/shared/ui/auth-loading";
import { Button } from "@/shared/ui/button";
import { Empty } from "@/shared/ui/empty";
import { fetchCustomerList } from "../api/customers-api";
import type { Customer } from "../model/customer-types";
import { useCustomersStore } from "../store/customers-store";
import { CustomerSheet } from "../ui/create-customer-sheet";
import { CustomerCard } from "../ui/customer-card";

/** Sort options for dropdown sorting */
type SortOption = "name-asc" | "name-desc" | "status-critical";

/**
 * Sort customers based on the selected sort option.
 */
function sortCustomers(customers: Customer[], option: SortOption): Customer[] {
  const sorted = [...customers];

  switch (option) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "status-critical": {
      const statusPriority: Record<CustomerStatus, number> = {
        red: 1,
        yellow: 2,
        green: 3,
      };
      return sorted.sort(
        (a, b) => statusPriority[a.status] - statusPriority[b.status],
      );
    }
    default:
      return sorted;
  }
}

/**
 * Customers page with responsive design:
 * - Mobile (< 768px): Card layout
 * - Tablet/Desktop (≥ 768px): Table layout
 *
 * Features:
 * - Search by customer name
 * - Filter by status (dropdown menu)
 * - Sort by various criteria (dropdown menu)
 * - Sortable columns (table view)
 */
export function CustomersPage() {
  const { selectedOrg, availableOrgs, loading: orgsLoading, selectOrg, createOrg } = useOrg();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">(
    "all",
  );
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);

  const handleCreateOrg = async (data: { name: string; slug: string }) => {
    setCreateOrgError(null);
    try {
      const newOrg = await createOrg(data);
      await selectOrg(newOrg.id);
    } catch (error) {
      console.error("Failed to create organisation:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create organisation. Please try again.";
      setCreateOrgError(errorMessage);
      throw error;
    }
  };

  const {
    data: apiCustomers = [],
    isLoading,
    error,
  } = useQuery<Customer[]>({
    queryKey: ["customers", "list", selectedOrg?.id],
    queryFn: () => fetchCustomerList(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
  });

  // Get sheet state from the store.
  const isCreateSheetOpen = useCustomersStore(
    (state) => state.isCreateSheetOpen,
  );
  const closeCreateSheet = useCustomersStore((state) => state.closeCreateSheet);

  // Filter and sort customers
  const customers = useMemo(() => {
    const merged = [...apiCustomers];

    // Apply search filter
    let filtered = merged;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(query));
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Apply sort
    if (sortOption) {
      filtered = sortCustomers(filtered, sortOption);
    }

    return filtered;
  }, [apiCustomers, searchQuery, statusFilter, sortOption]);

  if (!selectedOrg) {
    // Check if user has no orgs vs just loading
    if (!orgsLoading && availableOrgs.length === 0) {
      return (
        <>
          <div className="flex min-h-[400px] items-center justify-center">
            <Empty
              title="No Organizations Available"
              description="You haven't been assigned to any organizations. Ask your organization owner to invite you, or create your own to get started."
              action={{
                label: "Create Organization",
                onClick: () => setIsCreateOrgOpen(true),
              }}
            />
          </div>
          <CreateOrgModal
            open={isCreateOrgOpen}
            onOpenChange={setIsCreateOrgOpen}
            onSubmit={handleCreateOrg}
            error={createOrgError}
          />
        </>
      );
    }
    // Existing fallback for when loading or other edge cases
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Empty
          icon={<Building2 className="size-8 text-muted-foreground" />}
          title="No organisation selected"
          description="Please select an organisation to view customers."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <AuthLoading />
      </div>
    );
  }

  if (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch customers";
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Empty
          icon={<AlertCircle className="size-8 text-destructive" />}
          title="Error loading customers"
          description={message}
        />
      </div>
    );
  }

  const totalCustomers = apiCustomers.length;

  return (
    <div className="space-y-4 pt-2">
      {/* Page header with search and filters */}
      <header>
        <div className="flex items-center justify-between gap-4">
          {/* Search input - leading */}
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter and sort controls - trailing */}
          <div className="flex items-center gap-2">

            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Filter customers"
                    className={cn(statusFilter !== "all" && "text-primary")}
                  >
                    <Filter className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuPositioner align="end">
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("all")}
                      className={cn(statusFilter === "all" && "bg-accent")}
                    >
                      All Statuses
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("green")}
                      className={cn(statusFilter === "green" && "bg-accent")}
                    >
                      On Track
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("yellow")}
                      className={cn(statusFilter === "yellow" && "bg-accent")}
                    >
                      Warning
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("red")}
                      className={cn(statusFilter === "red" && "bg-accent")}
                    >
                      Critical
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenuPositioner>
            </DropdownMenu>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sort customers"
                    className={cn(sortOption && "text-primary")}
                  >
                    <ArrowUpDown className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuPositioner align="end">
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setSortOption("name-asc")}
                      className={cn(sortOption === "name-asc" && "bg-accent")}
                    >
                      Customer Name (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortOption("name-desc")}
                      className={cn(sortOption === "name-desc" && "bg-accent")}
                    >
                      Customer Name (Z-A)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setSortOption("status-critical")}
                      className={cn(
                        sortOption === "status-critical" && "bg-accent",
                      )}
                    >
                      Status (Critical First)
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenuPositioner>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Empty state */}
      {customers.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border/50 border-dashed bg-card/50">
          <Empty
            icon={<Users className="size-8 text-muted-foreground" />}
            title="No customers yet"
            description="Customers will appear here once they are added."
            action={{
              label: "Add customer",
              onClick: () => setIsCreateCustomerOpen(true),
            }}
          />
        </div>
      ) : (
        <>
          {/* Mobile view - Cards (< 768px) */}
          <div className="md:hidden space-y-3">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => setEditingCustomer(customer)}
              />
            ))}
          </div>

          {/* Desktop/Tablet view - Table (≥ 768px) */}
          <div className="hidden md:block">
            <CustomerTable
              customers={customers}
              onCustomerClick={(customer) => setEditingCustomer(customer)}
            />
          </div>
        </>
      )}

      {/* Edit customer sheet */}
      <CustomerSheet
        open={editingCustomer !== null}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer ?? undefined}
      />
      {/* Create customer sheet */}
      <CustomerSheet
        open={isCreateSheetOpen}
        onOpenChange={(open) => !open && closeCreateSheet()}
      />
    </div>
  );
}
