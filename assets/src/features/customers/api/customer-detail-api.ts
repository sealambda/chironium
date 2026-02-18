import { addMonths, formatISO } from "date-fns";

import type {
  CustomerSubscription,
  CustomerSubscriptionStatus,
} from "@/features/customers/types/customer-subscription";
import { graphql } from "@/gql";
import { requestGraphql } from "@/shared/api/graphql";
import { durationToMonths } from "@/shared/utils/duration-utils";

const CustomerSubscriptionsQuery = graphql(`
  query CustomerSubscriptions($subscriberId: ID!) {
    listSubscriptions(
      filter: { subscriberId: { eq: $subscriberId } }
      sort: [{ field: START_DATE, order: DESC }]
    ) {
      results {
        id
        state
        startDate
        plan {
          name
          duration { code value }
        }
      }
    }
  }
`);

/** Map backend state machine values to UI status labels. */
function mapSubscriptionStatus(state?: string | null): CustomerSubscriptionStatus {
  switch (state) {
    case "active":
      return "active";
    case "suspended":
      return "paused";
    case "expired":
      return "expired";
    case "canceled":
      return "cancelled";
    default:
      return "active";
  }
}

/** Fetch subscription history for a customer (Person). */
export async function fetchCustomerSubscriptions(
  subscriberId: string,
  organizationId: string,
): Promise<CustomerSubscription[]> {
  if (!subscriberId || !organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: CustomerSubscriptionsQuery,
    variables: { subscriberId },
    organizationId,
  });

  return (result.listSubscriptions?.results ?? []).map((item) => {
    const planDurationMonths = durationToMonths(item.plan.duration);
    const startDate = new Date(item.startDate);
    const endDate = addMonths(startDate, planDurationMonths);

    return {
      id: item.id,
      startDate: item.startDate,
      endDate: formatISO(endDate, { representation: "date" }),
      planDurationMonths,
      status: mapSubscriptionStatus(item.state),
    };
  });
}
