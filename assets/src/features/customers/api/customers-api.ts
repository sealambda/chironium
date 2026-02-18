import type { ResultOf } from "@graphql-typed-document-node/core";
import { addMonths } from "date-fns";

import type { Customer } from "@/features/customers/ui/customer-card";
import { graphql } from "@/gql";
import type { HumanName } from "@/gql/graphql";
import { requestGraphql } from "@/shared/api/graphql";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { durationToMonths } from "@/shared/utils/duration-utils";
import { getInitials } from "@/shared/utils/name-utils";

const SubscriptionListQuery = graphql(`
  query SubscriptionList($first: Int) {
    listSubscriptions(first: $first) {
      results {
        id
        state
        startDate
        subscriber {
          id
          name {
            given
            family
          }
          telecom {
            system
            value
          }
        }
        plan {
          id
          name
          duration {
            value
            code
          }
        }
      }
    }
  }
`);

type SubscriptionListItem = NonNullable<
  NonNullable<ResultOf<typeof SubscriptionListQuery>["listSubscriptions"]>["results"]
>[number];

/**
 * Build a display name from the first HumanName entry.
 */
function buildDisplayName(names?: HumanName[] | null): string {
  const primary = names?.[0];
  if (!primary) {
    return "Unknown";
  }

  const given = primary.given?.join(" ") ?? "";
  const family = primary.family ?? "";
  const full = `${given} ${family}`.trim();

  return full || "Unknown";
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

function toCustomer(item: SubscriptionListItem): Customer {
  const name = buildDisplayName(item.subscriber.name);
  const planDurationMonths = durationToMonths(item.plan.duration);
  const startDate = new Date(item.startDate);
  const endDate = addMonths(startDate, planDurationMonths);

  return {
    id: item.subscriber.id,
    name,
    initials: getInitials(name),
    status: mapSubscriptionState(item.state),
    subscription: {
      startDate,
      planDurationMonths,
      endDate,
    },
    contact: extractContactInfo(item.subscriber.telecom),
  };
}

/**
 * Fetch and transform customer list for a given organisation.
 */
export async function fetchCustomerList(organizationId: string): Promise<Customer[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: SubscriptionListQuery,
    variables: { first: 250 },
    organizationId,
  });

  return (result.listSubscriptions?.results ?? []).map(toCustomer);
}
