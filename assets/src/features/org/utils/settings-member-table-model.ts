import type { OrganizationSettingsData, PrincipalGrantRow } from "@/features/org/api/org-api";
import type { OrganizationUserRole } from "@/gql/graphql";
import * as m from "@/paraglide/messages";
import { givenFamilyFromUserProfile } from "@/shared/utils/name-utils";

export type MemberSource =
  | { kind: "owner"; userId: string }
  | { kind: "membership"; organizationUserId: string; userId: string }
  | { kind: "invitation"; invitationId: string };

type MemberRowDisplay = {
  key: string;
  primary: string;
  secondary: string | null;
  roleDisplay: string;
  status: string;
};

export type SettingsMemberTableRow = MemberRowDisplay & {
  source: MemberSource;
  orgRole: OrganizationUserRole | null;
  isOwner: boolean;
  hasPractitionerGrant: boolean;
  practitionerNamePreset: { givenName: string; familyName: string };
};

function isPendingInvitationState(state: string): boolean {
  return state.toLowerCase() === "pending";
}

export function hasActivePractitionerGrant(grants: PrincipalGrantRow[]): boolean {
  return grants.some((grant) => grant.principalType === "PRACTITIONER" && grant.active);
}

function formatMemberRoleCell(params: {
  orgRole: OrganizationUserRole | null;
  isOwner: boolean;
  hasPractitionerRole: boolean;
}): string {
  let primary: string;
  if (params.isOwner) {
    primary = m.settings_member_status_owner();
  } else if (params.orgRole === "POWER_USER") {
    primary = m.settings_invite_role_power_user();
  } else {
    primary = m.settings_invite_role_member();
  }

  if (params.hasPractitionerRole) {
    return `${primary} (${m.settings_role_practitioner()})`;
  }
  return primary;
}

/**
 * Builds rows for the settings members table: owner, active members, then pending invites
 * not already represented by an active account.
 */
export function buildSettingsMemberRows(
  organization: OrganizationSettingsData,
): SettingsMemberTableRow[] {
  const pendingByEmail = new Set<string>();
  for (const invitation of organization.invitations) {
    if (!isPendingInvitationState(invitation.state)) {
      continue;
    }
    const inviteEmail = invitation.email?.trim();
    if (!inviteEmail) {
      continue;
    }
    pendingByEmail.add(inviteEmail.toLowerCase());
  }

  const activeByEmail = new Map<string, SettingsMemberTableRow>();

  const addActiveMember = (
    member: {
      id: string;
      email: string;
      name: string | null;
      givenName: string | null;
      familyName: string | null;
    },
    params: { orgRole: OrganizationUserRole | null; isOwner: boolean },
    source: MemberSource,
  ) => {
    const trimmedEmail = member.email.trim();
    if (!trimmedEmail) {
      return;
    }

    const lowerEmail = trimmedEmail.toLowerCase();
    if (activeByEmail.has(lowerEmail)) {
      return;
    }

    const displayName = member.name?.trim() ?? "";
    const primary = displayName || trimmedEmail;
    const secondary = displayName ? trimmedEmail : null;

    activeByEmail.set(lowerEmail, {
      key: member.id,
      primary,
      secondary,
      roleDisplay: formatMemberRoleCell({
        orgRole: params.orgRole,
        isOwner: params.isOwner,
        hasPractitionerRole: false,
      }),
      status: pendingByEmail.has(lowerEmail)
        ? m.settings_member_status_pending()
        : m.settings_member_status_active(),
      source,
      orgRole: params.orgRole,
      isOwner: params.isOwner,
      hasPractitionerGrant: false,
      practitionerNamePreset: givenFamilyFromUserProfile(member),
    });
  };

  addActiveMember(
    organization.owner,
    { orgRole: null, isOwner: true },
    { kind: "owner", userId: organization.owner.id },
  );

  const ownerEmailKey = organization.owner.email.trim().toLowerCase();
  const ownerRow = activeByEmail.get(ownerEmailKey);
  if (ownerRow) {
    const grants = hasActivePractitionerGrant(organization.owner.principalGrants);
    ownerRow.hasPractitionerGrant = grants;
    ownerRow.roleDisplay = formatMemberRoleCell({
      orgRole: null,
      isOwner: true,
      hasPractitionerRole: grants,
    });
  }

  for (const ou of organization.organizationUsers) {
    addActiveMember(
      ou.user,
      { orgRole: ou.role, isOwner: false },
      { kind: "membership", organizationUserId: ou.id, userId: ou.user.id },
    );
    const existing = activeByEmail.get(ou.user.email.trim().toLowerCase());
    if (!existing) {
      continue;
    }

    const membershipGrants = hasActivePractitionerGrant(ou.principalGrants);

    // Owners are not normally present on `organizationUsers`, but if they are, keep owner row semantics.
    if (existing.isOwner) {
      existing.hasPractitionerGrant = existing.hasPractitionerGrant || membershipGrants;
      existing.roleDisplay = formatMemberRoleCell({
        orgRole: null,
        isOwner: true,
        hasPractitionerRole: existing.hasPractitionerGrant,
      });
      continue;
    }

    existing.hasPractitionerGrant = membershipGrants;
    existing.orgRole = ou.role;
    existing.source = {
      kind: "membership",
      organizationUserId: ou.id,
      userId: ou.user.id,
    };
    existing.practitionerNamePreset = givenFamilyFromUserProfile(ou.user);
    existing.roleDisplay = formatMemberRoleCell({
      orgRole: ou.role,
      isOwner: false,
      hasPractitionerRole: membershipGrants,
    });
  }

  const activeRows = [...activeByEmail.values()];

  const pendingRows = organization.invitations.flatMap((invitation) => {
    if (!isPendingInvitationState(invitation.state)) {
      return [];
    }

    const inviteEmail = invitation.email?.trim() ?? "";
    if (!inviteEmail) {
      return [];
    }

    const lowerEmail = inviteEmail.toLowerCase();
    if (activeByEmail.has(lowerEmail)) {
      return [];
    }

    const grants = hasActivePractitionerGrant(invitation.principalGrants);

    return [
      {
        key: invitation.id,
        primary: inviteEmail,
        secondary: null,
        roleDisplay: formatMemberRoleCell({
          orgRole: invitation.role,
          isOwner: false,
          hasPractitionerRole: grants,
        }),
        status: m.settings_member_status_pending(),
        source: { kind: "invitation", invitationId: invitation.id } satisfies MemberSource,
        orgRole: invitation.role,
        isOwner: false,
        hasPractitionerGrant: grants,
        practitionerNamePreset: { givenName: "", familyName: "" },
      } satisfies SettingsMemberTableRow,
    ];
  });

  return [...activeRows, ...pendingRows];
}

export function canManageOrgMembers(
  organization: OrganizationSettingsData | null | undefined,
  currentUserId: string | undefined,
): boolean {
  if (!organization || !currentUserId) {
    return false;
  }
  if (organization.owner.id === currentUserId) {
    return true;
  }
  return organization.organizationUsers.some(
    (ou) => ou.user.id === currentUserId && ou.role === "POWER_USER",
  );
}

export function memberRowHasActions(row: SettingsMemberTableRow): boolean {
  return (
    row.source.kind === "invitation" ||
    row.source.kind === "membership" ||
    !row.hasPractitionerGrant
  );
}
