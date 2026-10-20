import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsMemberActionsMenu } from "@/features/org/ui/settings-member-actions-menu";
import type { SettingsMemberTableRow } from "@/features/org/utils/settings-member-table-model";
import * as m from "@/paraglide/messages";

function invitationRow(expired: boolean): SettingsMemberTableRow {
  return {
    key: "inv-1",
    primary: "invitee@example.com",
    secondary: null,
    roleDisplay: "Member",
    status: "Pending invite",
    source: { kind: "invitation", invitationId: "inv-1", expired },
    orgRole: "MEMBER",
    isOwner: false,
    hasPractitionerGrant: false,
    practitionerNamePreset: { givenName: "", familyName: "" },
  };
}

async function openMenu(expired: boolean) {
  const user = userEvent.setup();
  const handlers = {
    onCopyInvitationLink: vi.fn(),
    onRenewInvitation: vi.fn(),
  };
  const row = invitationRow(expired);

  render(
    <SettingsMemberActionsMenu
      row={row}
      onEditRole={vi.fn()}
      onMakePractitioner={vi.fn()}
      onRevokeInvitation={vi.fn()}
      {...handlers}
    />,
  );
  await user.click(screen.getByTestId("member-actions-inv-1"));
  return { user, row, ...handlers };
}

describe("SettingsMemberActionsMenu", () => {
  afterEach(cleanup);

  it("offers Copy link on an unexpired invitation", async () => {
    const { user, row, onCopyInvitationLink } = await openMenu(false);

    expect(screen.queryByText(m.settings_member_renew_invitation())).not.toBeInTheDocument();
    expect(screen.getByText(m.settings_member_revoke_invitation())).toBeInTheDocument();

    await user.click(screen.getByText(m.settings_member_copy_link()));
    expect(onCopyInvitationLink).toHaveBeenCalledWith(row);
  });

  it("offers Renew instead on an expired invitation", async () => {
    const { user, row, onRenewInvitation } = await openMenu(true);

    expect(screen.queryByText(m.settings_member_copy_link())).not.toBeInTheDocument();
    expect(screen.getByText(m.settings_member_revoke_invitation())).toBeInTheDocument();

    await user.click(screen.getByText(m.settings_member_renew_invitation()));
    expect(onRenewInvitation).toHaveBeenCalledWith(row);
  });
});
