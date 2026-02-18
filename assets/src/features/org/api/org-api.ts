import type { OrgRecord } from "@/features/org/types";
import { graphql } from "@/gql";
import type { DurationUnit, Organization } from "@/gql/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

const ListOrganizationsQuery = graphql(`
  query ListOrganizations($first: Int) {
    listOrganizations(first: $first) {
      results {
        id
        name
        slug
      }
    }
  }
`);

const CreateOrganizationMutation = graphql(`
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      result {
        id
        name
        slug
      }
      errors {
        message
      }
    }
  }
`);

const CreateSubscriptionPlanMutation = graphql(`
  mutation CreateSubscriptionPlan($input: CreateSubscriptionPlanInput) {
    createSubscriptionPlan(input: $input) {
      result {
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
      errors {
        message
      }
    }
  }
`);

/**
 * Fetch accessible organizations from the API.
 */
export async function fetchAccessibleOrganizations(): Promise<OrgRecord[]> {
  const data = await requestGraphql({
    document: ListOrganizationsQuery,
    variables: { first: 10 },
  });
  return data.listOrganizations?.results ?? [];
}

/**
 * Create a new organization via API.
 */
export async function createOrganization(data: { name: string; slug: string }): Promise<OrgRecord> {
  const result = await requestGraphql({
    document: CreateOrganizationMutation,
    variables: { input: { name: data.name, slug: data.slug } },
  });

  return unwrapMutationResult(result.createOrganization, "Failed to create organization.");
}

export interface PlanFormData {
  name: string;
  durationValue: number;
  durationUnit: DurationUnit;
  priceAmount: number;
  currency: string;
}

export interface CreatedPlan {
  id: string;
  name: string | null;
  durationValue: string | null;
  durationUnit: string | null;
  priceAmount: string | null;
  currency: string | null;
}

/**
 * Create a subscription plan for an organization.
 */
export async function createSubscriptionPlan(
  data: PlanFormData,
  organizationId: string,
): Promise<CreatedPlan> {
  const result = await requestGraphql({
    document: CreateSubscriptionPlanMutation,
    variables: {
      input: {
        name: data.name,
        duration: {
          value: String(data.durationValue),
          code: data.durationUnit,
        },
        priceAmount: {
          amount: String(data.priceAmount),
          currency: data.currency,
        },
      },
    },
    organizationId,
  });

  const plan = unwrapMutationResult(
    result.createSubscriptionPlan,
    "Failed to create subscription plan.",
  );

  return {
    id: plan.id,
    name: plan.name ?? null,
    durationValue: plan.duration?.value ?? null,
    durationUnit: plan.duration?.code ?? null,
    priceAmount: plan.priceAmount?.amount ?? null,
    currency: plan.priceAmount?.currency ?? null,
  };
}
