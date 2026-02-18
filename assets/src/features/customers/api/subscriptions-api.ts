import { graphql, type ResultOf } from "@/graphql";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Subscriptions with Person ───────────────────────────────────────

const SubscriptionsWithPersonQuery = graphql(`
  query SubscriptionsWithPerson($first: Int) {
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
          duration {
            value
            code
          }
        }
      }
    }
  }
`);

export type SubscriptionWithPerson = NonNullable<
  NonNullable<ResultOf<typeof SubscriptionsWithPersonQuery>["listSubscriptions"]>["results"]
>[number];

/** Fetch subscriptions with nested person and plan data for an organisation. */
export async function fetchSubscriptionsWithPerson(
  organizationId: string,
): Promise<SubscriptionWithPerson[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: SubscriptionsWithPersonQuery,
    variables: { first: 250 },
    organizationId,
  });

  return result.listSubscriptions?.results ?? [];
}

// ─── Subscriptions by Person ─────────────────────────────────────────

const SubscriptionsByPersonQuery = graphql(`
  query SubscriptionsByPerson($subscriberId: ID!) {
    listSubscriptions(
      filter: { subscriberId: { eq: $subscriberId } }
      sort: [{ field: START_DATE, order: DESC }]
    ) {
      results {
        id
        state
        startDate
        plan {
          duration { code value }
        }
      }
    }
  }
`);

export type SubscriptionRecord = NonNullable<
  NonNullable<ResultOf<typeof SubscriptionsByPersonQuery>["listSubscriptions"]>["results"]
>[number];

/** Fetch subscription history for a person, sorted by start date descending. */
export async function fetchSubscriptionsByPerson(
  subscriberId: string,
  organizationId: string,
): Promise<SubscriptionRecord[]> {
  if (!subscriberId || !organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: SubscriptionsByPersonQuery,
    variables: { subscriberId },
    organizationId,
  });

  return result.listSubscriptions?.results ?? [];
}
