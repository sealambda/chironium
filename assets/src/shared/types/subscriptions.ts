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
      sort: [{ field: ID, order: DESC }]
    ) {
      results {
        id
        state
        startDate
        effectiveEndDate
        plan {
          id
          name
          duration {
            code
            value
          }
        }
        pauses {
          id
          startDate
          endDate
          reason
        }
        paperTrailVersions {
          versionInsertedAt
          versionActionName
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
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

export const UpdateSubscriptionMutation = graphql(`
  mutation UpdateSubscription($id: ID!, $input: UpdateSubscriptionInput!) {
    updateSubscription(id: $id, input: $input) {
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

export const SuspendSubscriptionMutation = graphql(`
  mutation SuspendSubscription($id: ID!, $input: SuspendSubscriptionInput!) {
    suspendSubscription(id: $id, input: $input) {
      result {
        id
        state
      }
      errors {
        message
      }
    }
  }
`);

export const ResumeSubscriptionMutation = graphql(`
  mutation ResumeSubscription($id: ID!, $input: ResumeSubscriptionInput!) {
    resumeSubscription(id: $id, input: $input) {
      result {
        id
        state
      }
      errors {
        message
      }
    }
  }
`);

export const CancelSubscriptionMutation = graphql(`
  mutation CancelSubscription($id: ID!, $input: CancelSubscriptionInput!) {
    cancelSubscription(id: $id, input: $input) {
      result {
        id
        state
      }
      errors {
        message
      }
    }
  }
`);

export const UpdateSubscriptionPauseMutation = graphql(`
  mutation UpdateSubscriptionPause($id: ID!, $input: UpdateSubscriptionPauseInput!) {
    updateSubscriptionPause(id: $id, input: $input) {
      result {
        id
        startDate
        endDate
        reason
      }
      errors {
        message
      }
    }
  }
`);

export const DeleteSubscriptionPauseMutation = graphql(`
  mutation DeleteSubscriptionPause($id: ID!) {
    deleteSubscriptionPause(id: $id) {
      result {
        id
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

/** A single pause window on a subscription. */
export type SubscriptionPause = NonNullable<SubscriptionRecord["pauses"]>[number];
