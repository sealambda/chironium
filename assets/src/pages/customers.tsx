import { useEffect, useState } from "react";

import { type Customer, CustomerCard } from "@/components/customers/customer-card";
import { buildHeaders } from "@/lib/auth-utils";
import { useOrg } from "@/lib/use-org";

interface MembershipData {
  id: string;
  startDate: string;
  endDate: string | null;
  status: string;
  person: {
    id: string;
    givenName: string | null;
    stSurname: string | null;
    ndSurname: string | null;
  };
}

interface GraphQLResponse {
  data?: {
    customerList?: MembershipData[];
  };
  errors?: Array<{ message: string }>;
}

/**
 * Calculate plan duration in months from start to end date.
 */
function calculatePlanDuration(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(diffDays / 30));
}

/**
 * Generate initials from person name.
 */
function generateInitials(givenName: string | null, surname: string | null): string {
  const first = givenName?.trim()?.[0]?.toUpperCase() || "";
  const last = surname?.trim()?.[0]?.toUpperCase() || "";
  return `${first}${last}` || "?";
}

/**
 * Generate full name from person data.
 */
function generateFullName(
  givenName: string | null,
  stSurname: string | null,
  ndSurname: string | null,
): string {
  const parts = [givenName, stSurname, ndSurname].filter(Boolean);
  return parts.join(" ") || "Unknown";
}

/**
 * Map membership data to Customer interface.
 */
function mapMembershipToCustomer(membership: MembershipData): Customer {
  const startDate = new Date(membership.startDate);
  const endDate = membership.endDate
    ? new Date(membership.endDate)
    : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  const planDuration = calculatePlanDuration(startDate, endDate);

  return {
    id: membership.id,
    name: generateFullName(
      membership.person.givenName,
      membership.person.stSurname,
      membership.person.ndSurname,
    ),
    avatarUrl: "",
    initials: generateInitials(membership.person.givenName, membership.person.stSurname),
    status: "up-to-date", // Placeholder - to be calculated from actual data.
    membership: {
      startDate,
      planDurationMonths: planDuration,
      endDate,
    },
    lastReview: {
      date: new Date(), // Placeholder.
      label: "N/A",
    },
    reports: {
      frequency: "Weekly", // Placeholder.
      nextDate: new Date(), // Placeholder.
      nextLabel: "N/A",
    },
  };
}

/**
 * Customers page displaying a scrollable list of customer cards.
 */
export function CustomersPage() {
  const { selectedOrg } = useOrg();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedOrg) {
      setLoading(false);
      return;
    }

    const fetchCustomers = async () => {
      setLoading(true);
      setError(null);

      try {
        const query = `
          query CustomerList($organisationId: ID!) {
            customerList(organisationId: $organisationId) {
              id
              startDate
              endDate
              status
              person {
                id
                givenName
                stSurname
                ndSurname
              }
            }
          }
        `;

        const response = await fetch("/gql", {
          method: "POST",
          credentials: "include",
          headers: buildHeaders(),
          body: JSON.stringify({
            query,
            variables: {
              organisationId: selectedOrg.id,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const result: GraphQLResponse = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message || "GraphQL error");
        }

        const memberships = result.data?.customerList || [];
        const mappedCustomers = memberships.map(mapMembershipToCustomer);
        setCustomers(mappedCustomers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch customers");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [selectedOrg]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">Loading customers...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">Error loading customers</div>
          <div className="text-muted-foreground text-sm">{error}</div>
        </div>
      </div>
    );
  }

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
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEmailClick={() => {}}
              onWhatsAppClick={() => {}}
              onCallClick={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
