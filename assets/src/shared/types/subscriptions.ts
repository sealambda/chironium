import { graphql, type ResultOf } from "@/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

export const ListSubscriptionsQuery = graphql(`
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

export const SubscriptionsByPersonQuery = graphql(`
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
          name
          duration {
            code
            value
          }
        }
      }
    }
  }
`);

export const ListSubscriptionPlansQuery = graphql(`
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

export const CreateSubscriptionMutation = graphql(`
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
