import { addMonths } from "date-fns";

import { type Subscription, SubscriptionListQuery } from "@/mocks/graphql";
import { requestGraphql } from "@/shared/api/graphql";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { parsePlanDurationMonths } from "@/shared/utils/duration-utils";
import { getInitials } from "@/shared/utils/name-utils";

import type { Customer } from "../ui/customer-card";

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
    contact: extractContactInfo(item.subscriber.contactPoints),
  };
}

/**
 * Fetch and transform customer list for a given organisation.
 */
export async function fetchCustomerList(organizationId: string): Promise<Customer[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql<{
    listSubscriptions: { results: Subscription[] };
  }>({
    document: SubscriptionListQuery,
    variables: { first: 250 },
    organizationId,
  });

  return (result.listSubscriptions?.results ?? []).map(toCustomer);
}
