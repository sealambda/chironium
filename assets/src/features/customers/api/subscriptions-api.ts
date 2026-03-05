import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const ListSubscriptionsQuery = graphql(`
  query ListSubscriptions($first: Int) {
    listSubscriptions(
      first: $first
      sort: [{ field: START_DATE, order: DESC }]
    ) {
      results {
        id
        state
        startDate
        subscriberId
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

const ListSubscriptionPlansQuery = graphql(`
  query ListSubscriptionPlans($first: Int) {
    listSubscriptionPlans(first: $first) {
      results {
        id
        name
        duration {
          value
          code
        }
        priceAmount {
          amount
          currency
        }
      }
    }
  }
`);

// ─── Mutations ───────────────────────────────────────────────────────

const CreateSubscriptionMutation = graphql(`
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      result {
        id
        state
        startDate
      }
      errors {
        message
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

/** Subscription with state, start date, subscriber ID, and plan duration. Used for list merging. */
export type SubscriptionListItem = NonNullable<
  NonNullable<ResultOf<typeof ListSubscriptionsQuery>["listSubscriptions"]>["results"]
>[number];

/** Subscription record with state, start date, and plan duration. */
export type SubscriptionRecord = NonNullable<
  NonNullable<ResultOf<typeof SubscriptionsByPersonQuery>["listSubscriptions"]>["results"]
>[number];

/** Available subscription plan with name, duration, and pricing. */
export type SubscriptionPlan = NonNullable<
  NonNullable<ResultOf<typeof ListSubscriptionPlansQuery>["listSubscriptionPlans"]>["results"]
>[number];

/** Form data for creating a new subscription. */
export interface SubscriptionFormData {
  planId: string;
  startDate?: string;
}

// ─── Functions ───────────────────────────────────────────────────────

/** Fetch all subscriptions for an organization, sorted by start date descending. */
export async function fetchSubscriptions(organizationId: string): Promise<SubscriptionListItem[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListSubscriptionsQuery,
    variables: { first: 250 },
    organizationId,
  });

  return result.listSubscriptions?.results ?? [];
}

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

/** Create a subscription for a person on the specified plan. */
export async function createSubscription(
  data: SubscriptionFormData,
  subscriberId: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CreateSubscriptionMutation,
    variables: {
      input: {
        subscriberId,
        planId: data.planId,
        startDate: data.startDate || undefined,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createSubscription, "Failed to create subscription.");
}

/** Fetch all available subscription plans for the organization. */
export async function fetchSubscriptionPlans(organizationId: string): Promise<SubscriptionPlan[]> {
  const data = await requestGraphql({
    document: ListSubscriptionPlansQuery,
    variables: { first: 50 },
    organizationId,
  });

  return data.listSubscriptionPlans?.results ?? [];
}
