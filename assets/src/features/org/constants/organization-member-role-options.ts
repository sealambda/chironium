import * as m from "@/paraglide/messages";
import type { OrganizationUserRole } from "@/shared/types/schema-enums";

/** Select options for org membership role (member vs manager), used in invite and role edit flows. */
export const ORGANIZATION_MEMBER_ROLE_OPTIONS: ReadonlyArray<{
  value: OrganizationUserRole;
  label: () => string;
}> = [
  { value: "MEMBER", label: m.settings_invite_role_member },
  { value: "POWER_USER", label: m.settings_invite_role_power_user },
];
