import { graphql } from "@/gql";
import type { CreateSubscriptionInput, SubscriptionPlan } from "@/gql/graphql";
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

const ListPlansQuery = graphql(`
  query ListPlans {
    listPlans {
      results {
        id
        name
        periodDuration
      }
    }
  }
`);

const CreateContactWithContactPointsMutation = graphql(`
  mutation CreateContactWithContactPoints(
    $input: CreateContactWithContactPointsInput!
  ) {
    createContactWithContactPoints(input: $input) {
      result {
        id
        name
        contactPoints {
          id
          type
          value
        }
      }
      errors {
        message
        fields
      }
    }
  }
`);

const CreateSubscriptionMutation = graphql(`
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      result {
        id
        startDate
        state
        subscriberId
        planId
      }
      errors {
        message
        fields
      }
    }
  }
`);

export async function fetchPlans(
  organizationId: string,
): Promise<SubscriptionPlan[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListPlansQuery,
    organizationId,
  });

  return result.listPlans?.results ?? [];
}

export type CreateContactInput = {
  name: string;
  contactPoints?: Array<{
    type: "EMAIL" | "PHONE" | "INSTAGRAM";
    value: string;
    isPrimary?: boolean;
  }>;
};

export async function createContact(
  input: CreateContactInput,
  organizationId: string,
): Promise<CreatedContact> {
  const result = await requestGraphql({
    document: CreateContactWithContactPointsMutation,
    variables: { input },
    organizationId,
  });

  const payload = result.createContactWithContactPoints;
  if (!payload?.result) {
    const errorMessage =
      payload?.errors
        ?.map((e) => e.message)
        .filter(Boolean)
        .join(" ") || "Failed to create contact";
    throw new Error(errorMessage);
  }

  return payload.result;
}

export async function createSubscription(
  input: CreateSubscriptionInput,
  organizationId: string,
) {
  const result = await requestGraphql({
    document: CreateSubscriptionMutation,
    variables: { input },
    organizationId,
  });

  const payload = result.createSubscription;
  if (!payload?.result) {
    const errorMessage =
      payload?.errors
        ?.map((e) => e.message)
        .filter(Boolean)
        .join(" ") || "Failed to create subscription";
    throw new Error(errorMessage);
  }

  return payload.result;
}
