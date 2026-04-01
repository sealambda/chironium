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
        ownerId
      }
    }
  }
`);

const GetOrganizationSettingsQuery = graphql(`
  query GetOrganizationSettings($id: ID!) {
    getOrganization(id: $id) {
      id
      name
      slug
      owner {
        id
        email
        name
      }
      users {
        id
        email
        name
      }
      invitations {
        id
        email
        state
      }
    }
  }
`);

const FindCurrentEmailInvitationsQuery = graphql(`
  query FindCurrentEmailInvitations($sort: [InvitationSortInput!], $filter: InvitationFilterInput) {
    findCurrentEmailInvitations(sort: $sort, filter: $filter) {
      id
      email
      inviteCode
      organizationId
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
        ownerId
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

const InviteUsersToOrganizationMutation = graphql(`
  mutation InviteUsersToOrganization($id: ID!, $input: InviteUsersToOrganizationInput) {
    inviteUsersToOrganization(id: $id, input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const AcceptInvitationMutation = graphql(`
  mutation AcceptInvitation($inviteCode: String!) {
    acceptInvitation(inviteCode: $inviteCode) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const RejectInvitationMutation = graphql(`
  mutation RejectInvitation($inviteCode: String!) {
    rejectInvitation(inviteCode: $inviteCode) {
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

/** A user row returned with organization settings (owner or member). */
export interface OrganizationMemberUser {
  id: string;
  email: string;
  name: string | null;
}

/** Organization settings data including members and invitations. */
export interface OrganizationSettingsData {
  id: string;
  name: string;
  slug: string;
  owner: OrganizationMemberUser;
  users: OrganizationMemberUser[];
  invitations: Array<{
    id: string;
    email: string | null;
    state: string;
  }>;
}

export interface PendingInvitation {
  id: string;
  email: string | null;
  inviteCode: string | null;
  organizationId: string;
}

export type InvitationRole = "member" | "power_user";

// ─── Functions ───────────────────────────────────────────────────────

/** Fetch all organizations the current user has access to. */
export async function fetchAccessibleOrganizations(): Promise<OrganizationRecord[]> {
  const data = await requestGraphql({
    document: ListOrganizationsQuery,
    variables: { first: 10 },
  });
  return data.listOrganizations?.results ?? [];
}

/** Fetch selected organization metadata and invitations. */
export async function fetchOrganizationSettings(
  organizationId: string,
): Promise<OrganizationSettingsData | null> {
  const data = await requestGraphql({
    document: GetOrganizationSettingsQuery,
    variables: { id: organizationId },
  });

  if (!data.getOrganization) {
    return null;
  }

  return {
    id: data.getOrganization.id,
    name: data.getOrganization.name,
    slug: data.getOrganization.slug,
    owner: {
      id: data.getOrganization.owner.id,
      email: data.getOrganization.owner.email,
      name: data.getOrganization.owner.name ?? null,
    },
    users: data.getOrganization.users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name ?? null,
    })),
    invitations: data.getOrganization.invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email ?? null,
      state: invitation.state,
    })),
  };
}

/** Fetch invitations matching the current user's email address. */
export async function fetchCurrentEmailInvitations(): Promise<PendingInvitation[]> {
  const data = await requestGraphql({
    document: FindCurrentEmailInvitationsQuery,
    variables: {
      sort: [{ field: "EMAIL", order: "ASC" }],
      filter: {
        state: { eq: "pending" },
      },
    },
  });

  return data.findCurrentEmailInvitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email ?? null,
    inviteCode: invitation.inviteCode ?? null,
    organizationId: invitation.organizationId,
  }));
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

/** Invite a user by email to the given organization. */
export async function inviteUserToOrganization(params: {
  organizationId: string;
  email: string;
  role: InvitationRole;
}): Promise<void> {
  const result = await requestGraphql({
    document: InviteUsersToOrganizationMutation,
    variables: {
      id: params.organizationId,
      input: {
        invitations: [{ email: params.email, role: params.role }],
      },
    },
    organizationId: params.organizationId,
  });

  unwrapMutationResult(result.inviteUsersToOrganization, "Failed to invite member.");
}

/** Accept a pending invitation using its invite code. */
export async function acceptInvitation(inviteCode: string): Promise<void> {
  const result = await requestGraphql({
    document: AcceptInvitationMutation,
    variables: { inviteCode },
  });

  unwrapMutationResult(result.acceptInvitation, "Failed to accept invitation.");
}

/** Reject a pending invitation using its invite code. */
export async function rejectInvitation(inviteCode: string): Promise<void> {
  const result = await requestGraphql({
    document: RejectInvitationMutation,
    variables: { inviteCode },
  });

  unwrapMutationResult(result.rejectInvitation, "Failed to reject invitation.");
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
