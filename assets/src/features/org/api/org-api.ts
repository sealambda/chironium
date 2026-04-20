import type { OrganizationUserRole, PrincipalType } from "@/gql/graphql";
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
        organizationUsers {
          userId
          role
        }
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
      preferredLocale
      owner {
        id
        email
        name
        givenName
        familyName
        principalGrants {
          principalType
          principalId
          active
        }
      }
      organizationUsers {
        id
        role
        principalGrants {
          principalType
          principalId
          active
        }
        user {
          id
          email
          name
          givenName
          familyName
        }
      }
      invitations {
        id
        email
        state
        role
        principalGrants {
          principalType
          principalId
          active
        }
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

const UpdateOrganizationMutation = graphql(`
  mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationInput) {
    updateOrganization(id: $id, input: $input) {
      result {
        id
        preferredLocale
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

const CreatePrincipalGrantMutation = graphql(`
  mutation CreatePrincipalGrant($input: CreatePrincipalGrantInput!) {
    createPrincipalGrant(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const UpdateOrganizationUserMutation = graphql(`
  mutation UpdateOrganizationUser($id: ID!, $input: UpdateOrganizationUserInput) {
    updateOrganizationUser(id: $id, input: $input) {
      result {
        id
        role
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

const RevokeInvitationMutation = graphql(`
  mutation RevokeInvitation($id: ID!) {
    revokeInvitation(id: $id) {
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

/** Principal grant fields needed for settings role display (matches GraphQL selection). */
export interface PrincipalGrantRow {
  principalType: PrincipalType;
  principalId: string;
  active: boolean;
}

/** A user row returned with organization settings (owner or member). */
export interface OrganizationMemberUser {
  id: string;
  email: string;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  principalGrants: PrincipalGrantRow[];
}

/** Join row for org membership; `role` is `OrganizationUserRole`. */
export interface OrganizationMembershipRow {
  id: string;
  role: OrganizationUserRole;
  principalGrants: PrincipalGrantRow[];
  user: Omit<OrganizationMemberUser, "principalGrants">;
}

/** Organization settings data including members and invitations. */
export interface OrganizationSettingsData {
  id: string;
  name: string;
  slug: string;
  preferredLocale: string;
  owner: OrganizationMemberUser;
  organizationUsers: OrganizationMembershipRow[];
  invitations: Array<{
    id: string;
    email: string | null;
    state: string;
    role: OrganizationUserRole;
    principalGrants: PrincipalGrantRow[];
  }>;
}

// ─── Functions ───────────────────────────────────────────────────────

/** Fetch all organizations the current user has access to. */
export async function fetchAccessibleOrganizations(): Promise<OrganizationRecord[]> {
  const data = await requestGraphql({
    document: ListOrganizationsQuery,
    variables: { first: 100 },
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
    organizationId,
  });

  if (!data.getOrganization) {
    return null;
  }

  return {
    id: data.getOrganization.id,
    name: data.getOrganization.name,
    slug: data.getOrganization.slug,
    preferredLocale: data.getOrganization.preferredLocale,
    owner: {
      id: data.getOrganization.owner.id,
      email: data.getOrganization.owner.email,
      name: data.getOrganization.owner.name ?? null,
      givenName: data.getOrganization.owner.givenName ?? null,
      familyName: data.getOrganization.owner.familyName ?? null,
      principalGrants: data.getOrganization.owner.principalGrants,
    },
    organizationUsers: data.getOrganization.organizationUsers.map((row) => ({
      id: row.id,
      role: row.role,
      principalGrants: row.principalGrants,
      user: {
        id: row.user.id,
        email: row.user.email,
        name: row.user.name ?? null,
        givenName: row.user.givenName ?? null,
        familyName: row.user.familyName ?? null,
      },
    })),
    invitations: data.getOrganization.invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email ?? null,
      state: invitation.state,
      role: invitation.role,
      principalGrants: invitation.principalGrants,
    })),
  };
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

  const organization = unwrapMutationResult(
    result.createOrganization,
    "Failed to create organization.",
  );

  return {
    ...organization,
    organizationUsers: [],
  };
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
  role: OrganizationUserRole;
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

/**
 * Invite a user and attach principal grants (e.g. link accepted account to a practitioner).
 */
export async function inviteUserWithPrincipalGrants(params: {
  organizationId: string;
  email: string;
  principalGrants: Array<{ principalType: PrincipalType; principalId: string }>;
  role?: OrganizationUserRole;
}): Promise<void> {
  const invitation =
    params.role === undefined
      ? { email: params.email, principalGrants: params.principalGrants }
      : {
          email: params.email,
          principalGrants: params.principalGrants,
          role: params.role,
        };

  const result = await requestGraphql({
    document: InviteUsersToOrganizationMutation,
    variables: {
      id: params.organizationId,
      input: {
        invitations: [invitation],
      },
    },
    organizationId: params.organizationId,
  });

  unwrapMutationResult(result.inviteUsersToOrganization, "Failed to send invitation.");
}

/** Link an existing org member or pending invitation to a principal (tenant-scoped; power users only). */
export async function createPrincipalGrant(params: {
  organizationId: string;
  userId?: string;
  invitationId?: string;
  principalType: PrincipalType;
  principalId: string;
}): Promise<void> {
  const hasUserId = params.userId != null && params.userId !== "";
  const hasInvitationId = params.invitationId != null && params.invitationId !== "";
  if (hasUserId === hasInvitationId) {
    throw new Error(
      "Provide exactly one of userId or invitationId when linking a principal grant.",
    );
  }

  const result = await requestGraphql({
    document: CreatePrincipalGrantMutation,
    variables: {
      input: {
        ...(hasUserId ? { userId: params.userId } : { invitationId: params.invitationId }),
        principalType: params.principalType,
        principalId: params.principalId,
        active: true,
      },
    },
    organizationId: params.organizationId,
  });

  unwrapMutationResult(result.createPrincipalGrant, "Failed to link principal grant.");
}

/** Update organization role for an active member (not the owner row). */
export async function updateOrganizationUserRole(params: {
  organizationId: string;
  organizationUserId: string;
  role: OrganizationUserRole;
}): Promise<void> {
  const result = await requestGraphql({
    document: UpdateOrganizationUserMutation,
    variables: {
      id: params.organizationUserId,
      input: { role: params.role },
    },
    organizationId: params.organizationId,
  });

  unwrapMutationResult(result.updateOrganizationUser, "Failed to update member role.");
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

/** Update the organization's preferred locale for invitation emails. */
export async function updateOrganizationPreferredLocale(params: {
  organizationId: string;
  preferredLocale: string;
}): Promise<void> {
  const result = await requestGraphql({
    document: UpdateOrganizationMutation,
    variables: {
      id: params.organizationId,
      input: { preferredLocale: params.preferredLocale },
    },
    organizationId: params.organizationId,
  });

  unwrapMutationResult(result.updateOrganization, "Failed to update organization settings.");
}

/** Revoke a pending invitation from organization settings. */
export async function revokeInvitation(params: {
  organizationId: string;
  invitationId: string;
}): Promise<void> {
  const result = await requestGraphql({
    document: RevokeInvitationMutation,
    variables: { id: params.invitationId },
    organizationId: params.organizationId,
  });

  unwrapMutationResult(result.revokeInvitation, "Failed to revoke invitation.");
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
