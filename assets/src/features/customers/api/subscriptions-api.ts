import type { VariablesOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import {
  CreateSubscriptionMutation,
  ListSubscriptionPlansQuery,
  ListSubscriptionsQuery,
  type SubscriptionListItem,
  type SubscriptionPlan,
  type SubscriptionRecord,
  SubscriptionsByPersonQuery,
} from "@/shared/types/subscriptions";

type CreateSubscriptionInput = NonNullable<VariablesOf<typeof CreateSubscriptionMutation>["input"]>;

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
  data: Pick<CreateSubscriptionInput, "planId" | "startDate">,
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
