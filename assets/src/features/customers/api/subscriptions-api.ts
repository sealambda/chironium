import type { VariablesOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import {
  CancelSubscriptionMutation,
  CreateSubscriptionMutation,
  DeleteSubscriptionPauseMutation,
  ListSubscriptionPlansQuery,
  ListSubscriptionsQuery,
  ResumeSubscriptionMutation,
  type SubscriptionListItem,
  type SubscriptionPlan,
  type SubscriptionRecord,
  SubscriptionsByPersonQuery,
  SuspendSubscriptionMutation,
  UpdateSubscriptionMutation,
  UpdateSubscriptionPauseMutation,
} from "@/shared/types/subscriptions";

type CreateSubscriptionInput = NonNullable<VariablesOf<typeof CreateSubscriptionMutation>["input"]>;
type UpdateSubscriptionInput = NonNullable<VariablesOf<typeof UpdateSubscriptionMutation>["input"]>;
type SuspendSubscriptionInput = NonNullable<
  VariablesOf<typeof SuspendSubscriptionMutation>["input"]
>;
type ResumeSubscriptionInput = NonNullable<VariablesOf<typeof ResumeSubscriptionMutation>["input"]>;
type CancelSubscriptionInput = NonNullable<VariablesOf<typeof CancelSubscriptionMutation>["input"]>;
type UpdateSubscriptionPauseInput = NonNullable<
  VariablesOf<typeof UpdateSubscriptionPauseMutation>["input"]
>;

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

/** Fetch subscription history for a person, sorted by newest record first. */
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

/** Update an existing subscription's plan and/or start date. */
export async function updateSubscription(
  id: string,
  data: Pick<UpdateSubscriptionInput, "planId" | "startDate">,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateSubscriptionMutation,
    variables: {
      id,
      input: {
        planId: data.planId ?? undefined,
        startDate: data.startDate || undefined,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.updateSubscription, "Failed to update subscription.");
}

/** Suspend an active subscription, optionally recording a reason. */
export async function suspendSubscription(
  id: string,
  data: Pick<SuspendSubscriptionInput, "reason" | "suspendedAt">,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: SuspendSubscriptionMutation,
    variables: {
      id,
      input: {
        reason: data.reason?.trim() || undefined,
        suspendedAt: data.suspendedAt || undefined,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.suspendSubscription, "Failed to suspend subscription.");
}

/** Resume a suspended/expired/canceled subscription, closing any open pause. */
export async function resumeSubscription(
  id: string,
  data: Pick<ResumeSubscriptionInput, "endDate">,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: ResumeSubscriptionMutation,
    variables: {
      id,
      input: {
        endDate: data.endDate || undefined,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.resumeSubscription, "Failed to resume subscription.");
}

/** Cancel a subscription, closing any open pause as of the provided end date. */
export async function cancelSubscription(
  id: string,
  data: Pick<CancelSubscriptionInput, "endDate">,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CancelSubscriptionMutation,
    variables: {
      id,
      input: {
        endDate: data.endDate || undefined,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.cancelSubscription, "Failed to cancel subscription.");
}

/** Update an existing pause's window or reason. */
export async function updateSubscriptionPause(
  id: string,
  data: Pick<UpdateSubscriptionPauseInput, "startDate" | "endDate" | "reason">,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateSubscriptionPauseMutation,
    variables: {
      id,
      input: {
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        reason: data.reason?.trim() || undefined,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.updateSubscriptionPause, "Failed to update pause.");
}

/** Delete a pause record. */
export async function deleteSubscriptionPause(id: string, organizationId: string): Promise<void> {
  const result = await requestGraphql({
    document: DeleteSubscriptionPauseMutation,
    variables: { id },
    organizationId,
  });

  unwrapMutationResult(result.deleteSubscriptionPause, "Failed to delete pause.");
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
