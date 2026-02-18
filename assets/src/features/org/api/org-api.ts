import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { DurationUnit } from "@/shared/types/schema-enums";

// ─── Queries ─────────────────────────────────────────────────────────

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

// ─── Mutations ───────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────

/** An organization record with its ID, name, and URL slug. */
export type OrganizationRecord = NonNullable<
  NonNullable<ResultOf<typeof ListOrganizationsQuery>["listOrganizations"]>["results"]
>[number];

/** Form data for creating a new subscription plan. */
export interface PlanFormData {
  name: string;
  durationValue: number;
  durationUnit: DurationUnit;
  priceAmount: number;
  currency: string;
}

/** The plan record returned after a successful creation, with nullable API fields flattened. */
export interface CreatedPlan {
  id: string;
  name: string | null;
  durationValue: string | null;
  durationUnit: string | null;
  priceAmount: string | null;
  currency: string | null;
}

/** Collected form state for org creation, submitted in a single batch. */
export interface OrgCreationDraft {
  orgDetails: { name: string; slug: string } | null;
  plans: PlanFormData[];
}

// ─── Functions ───────────────────────────────────────────────────────

/** Fetch all organizations the current user has access to. */
export async function fetchAccessibleOrganizations(): Promise<OrganizationRecord[]> {
  const data = await requestGraphql({
    document: ListOrganizationsQuery,
    variables: { first: 10 },
  });
  return data.listOrganizations?.results ?? [];
}

/** Create a new organization with the given name and slug. */
export async function createOrganization(data: {
  name: string;
  slug: string;
}): Promise<OrganizationRecord> {
  const result = await requestGraphql({
    document: CreateOrganizationMutation,
    variables: { input: { name: data.name, slug: data.slug } },
  });

  return unwrapMutationResult(result.createOrganization, "Failed to create organization.");
}

/** Create a subscription plan for an organization with duration and pricing. */
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
