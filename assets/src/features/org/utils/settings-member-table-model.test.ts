import { describe, expect, it } from "vitest";

import type { OrganizationSettingsData } from "@/features/org/api/org-api";
import { buildSettingsMemberRows } from "@/features/org/utils/settings-member-table-model";
import * as m from "@/paraglide/messages";

const NOW = new Date("2026-10-20T12:00:00Z");

function organizationWithInvitations(
  invitations: Array<{ id: string; email: string; expiresAt: string | null }>,
): OrganizationSettingsData {
  return {
    id: "org-1",
    name: "Org",
    slug: "org",
    preferredLocale: "en",
    owner: {
      id: "owner-1",
      email: "owner@example.com",
      name: null,
      givenName: null,
      familyName: null,
      principalGrants: [],
    },
    organizationUsers: [],
    invitations: invitations.map((invitation) => ({
      ...invitation,
      state: "pending",
      role: "MEMBER",
      principalGrants: [],
    })),
  };
}

describe("settings member rows", () => {
  it("marks invitations past their expiry, or without one, as expired", () => {
    const rows = buildSettingsMemberRows(
      organizationWithInvitations([
        { id: "fresh", email: "fresh@example.com", expiresAt: "2026-10-25T12:00:00Z" },
        { id: "old", email: "old@example.com", expiresAt: "2026-10-19T12:00:00Z" },
        { id: "now", email: "now@example.com", expiresAt: "2026-10-20T12:00:00Z" },
        { id: "legacy", email: "legacy@example.com", expiresAt: null },
      ]),
      NOW,
    );

    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    expect(byKey.fresh?.status).toBe(m.settings_member_status_pending());
    expect(byKey.fresh?.source).toEqual({
      kind: "invitation",
      invitationId: "fresh",
      expired: false,
    });
    expect(byKey.old?.status).toBe(m.settings_member_status_expired());
    // The server treats `expires_at == now` as expired, since it requires `expires_at > now()`.
    expect(byKey.now?.status).toBe(m.settings_member_status_expired());
    expect(byKey.legacy?.status).toBe(m.settings_member_status_expired());
    expect(byKey.legacy?.source).toEqual({
      kind: "invitation",
      invitationId: "legacy",
      expired: true,
    });
  });
});
