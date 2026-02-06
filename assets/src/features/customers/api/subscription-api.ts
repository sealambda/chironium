import {
  type CreateContactInput,
  CreateContactMutation,
  type CreateContactResult,
  type CreateSubscriptionInput,
  CreateSubscriptionMutation,
  type CreateSubscriptionResult,
  ListPlansQuery,
  type SubscriptionPlan,
} from "@/mocks/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

export type CreatedContact = {
  id: string;
  name?: string | null;
  contactPoints: Array<{
    id: string;
    type?: string | null;
    value?: string | null;
  }>;
};

export async function fetchPlans(organizationId: string): Promise<SubscriptionPlan[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql<{
    listPlans: { results: SubscriptionPlan[] };
  }>({
    document: ListPlansQuery,
    variables: {},
    organizationId,
  });

  return result.listPlans?.results ?? [];
}

export async function createContact(
  input: CreateContactInput,
  organizationId: string,
): Promise<CreatedContact> {
  const result = await requestGraphql<{
    createContactWithContactPoints: CreateContactResult;
  }>({
    document: CreateContactMutation,
    variables: { input },
    organizationId,
  });

  return unwrapMutationResult(result.createContactWithContactPoints, "Failed to create contact");
}

export async function createSubscription(input: CreateSubscriptionInput, organizationId: string) {
  const result = await requestGraphql<{
    createSubscription: CreateSubscriptionResult;
  }>({
    document: CreateSubscriptionMutation,
    variables: { input },
    organizationId,
  });

  return unwrapMutationResult(result.createSubscription, "Failed to create subscription");
}
