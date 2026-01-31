import { addMonths } from "date-fns";
import { requestGraphql } from "@/shared/api/graphql";
import type { Customer } from "../ui/customer-card";
import { graphql } from "@/gql/gql";
import type { Subscription } from "@/gql/graphql";

type SubscriptionListQuery = {
  listSubscriptions: {
    results: Subscription[];
  };
};

const SubscriptionListQuery = graphql(`
  query SubscriptionList($first: Int) {
    listSubscriptions(first: $first) {
      results {
        id
        state
        startDate
        subscriber {
          id
          name
          contactPoints {
            type
            value
          }
        }
        plan {
          id
          name
          periodDuration
        }
      }
    }
  }
`);

function parsePlanDurationMonths(periodDuration?: string | null): number {
  if (!periodDuration) return 3;
  const normalized = periodDuration.trim().toLowerCase();
  const isoMatch = /^p(\d+)m$/.exec(normalized);
  if (isoMatch) {
    return Number.parseInt(isoMatch[1] ?? "3", 10);
  }
  const textMatch = /(\d+)\s*(mo|month)/.exec(normalized);
  if (textMatch) {
    return Number.parseInt(textMatch[1] ?? "3", 10);
  }
  return 3;
}

function mapSubscriptionState(state?: string | null): Customer["status"] {
  switch (state) {
    case "active":
      return "up-to-date";
    case "suspended":
      return "needs-attention";
    case "expired":
    case "canceled":
      return "overdue";
    default:
      return "up-to-date";
  }
}

function toCustomer(item: Subscription): Customer {
  const name = item.subscriber.name?.trim() || "Unknown";
  const planDurationMonths = parsePlanDurationMonths(item.plan.periodDuration);
  const startDate = new Date(item.startDate);
  const endDate = addMonths(startDate, planDurationMonths);
  const nameParts = name.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts.at(0)?.[0] || "";
  const lastInitial = nameParts.at(-1)?.[0] || "";
  const initials =
    `${firstInitial}${lastInitial || firstInitial}`.toUpperCase() || "?";

  const email = item.subscriber.contactPoints?.find(
    (point) => point.type === "EMAIL",
  )?.value;
  const phone = item.subscriber.contactPoints?.find(
    (point) => point.type === "PHONE",
  )?.value;
  const instagram = item.subscriber.contactPoints?.find(
    (point) => point.type === "INSTAGRAM",
  )?.value;

  return {
    id: item.subscriber.id,
    name,
    initials,
    status: mapSubscriptionState(item.state),
    subscription: {
      startDate,
      planDurationMonths,
      endDate,
    },
    contact: {
      email: email || undefined,
      phone: phone || undefined,
      instagram: instagram || undefined,
    },
  };
}

/**
 * Fetch and transform customer list for a given organisation.
 *
 * @param organisationId - The ID of the organisation.
 * @returns Array of transformed customer objects.
 * @throws Error if the fetch fails or GraphQL returns errors.
 */
export async function fetchCustomerList(
  organizationId: string,
): Promise<Customer[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql<SubscriptionListQuery>({
    document: SubscriptionListQuery,
    variables: { first: 250 },
    organizationId,
  });

  const subscriptions = result.listSubscriptions?.results ?? [];
  return subscriptions.map(toCustomer);
}
