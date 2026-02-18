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

export type OrganizationSummary = Omit<Organization, "paperTrailVersions">;

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
export async function fetchAccessibleOrganizations(): Promise<OrganizationSummary[]> {
  const data = await requestGraphql({
    document: ListOrganizationsQuery,
    variables: { first: 10 },
  });
  return data.listOrganizations?.results ?? [];
}

/**
 * Create a new organization via API.
 */
export async function createOrganization(data: { name: string; slug: string }): Promise<OrganizationSummary> {
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

// ---------------------------------------------------------------------------
// Batch submission
// ---------------------------------------------------------------------------

export interface OrgCreationDraft {
  orgDetails: { name: string; slug: string } | null;
  plans: PlanFormData[];
}

/**
 * Submit the entire org creation draft in one shot.
 * Creates the organization first, then all subscription plans concurrently.
 * Returns the new organization's ID.
 */
export async function submitOrgCreation(draft: OrgCreationDraft): Promise<string> {
  if (!draft.orgDetails) {
    throw new Error("Organization details are required.");
  }

  const org = await createOrganization(draft.orgDetails);

  if (draft.plans.length > 0) {
    await Promise.all(draft.plans.map((plan) => createSubscriptionPlan(plan, org.id)));
  }

  return org.id;
}
