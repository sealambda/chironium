import { requestGraphql } from "@/shared/api/graphql";
import type { Customer } from "../ui/customer-card";
import type { Membership } from "@/gql/graphql";
import { graphql } from "@/gql";

const CustomerListQuery = graphql(`
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
`);

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
function generateInitials(
  givenName: string | null,
  surname: string | null,
): string {
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
function mapMembershipToCustomer(membership: Membership): Customer {
  const startDate = new Date(membership.startDate);
  const endDate = membership.endDate
    ? new Date(membership.endDate)
    : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  const planDuration = calculatePlanDuration(startDate, endDate);

  return {
    id: membership.id,
    name: generateFullName(
      membership.person.givenName || null,
      membership.person.stSurname || null,
      membership.person.ndSurname || null,
    ),
    avatarUrl: "",
    initials: generateInitials(
      membership.person.givenName || null,
      membership.person.stSurname || null,
    ),
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
 * Execute the GraphQL query and parse response.
 */
async function executeCustomerListQuery(
  organisationId: string,
): Promise<Membership[]> {
  const result = await requestGraphql({
    document: CustomerListQuery,
    variables: { organisationId },
  });

  return (result?.customerList as Membership[]) || [];
}

/**
 * Fetch and transform customer list for a given organisation.
 *
 * @param organisationId - The ID of the organisation.
 * @returns Array of transformed customer objects.
 * @throws Error if the fetch fails or GraphQL returns errors.
 */
export async function fetchCustomerList(
  organisationId: string,
): Promise<Customer[]> {
  const memberships = await executeCustomerListQuery(organisationId);
  return memberships.map(mapMembershipToCustomer);
}
