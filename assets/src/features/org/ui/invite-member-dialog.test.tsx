import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InviteMemberDialog } from "@/features/org/ui/invite-member-dialog";

const { inviteUserToOrganization, inviteUserWithPrincipalGrants, createPractitioner } = vi.hoisted(
  () => ({
    inviteUserToOrganization: vi.fn(),
    inviteUserWithPrincipalGrants: vi.fn(),
    createPractitioner: vi.fn(),
  }),
);

vi.mock("@/features/org/api/org-api", () => ({
  inviteUserToOrganization,
  inviteUserWithPrincipalGrants,
}));

vi.mock("@/features/practitioners/api/practitioners-api", () => ({
  createPractitioner,
}));

describe("InviteMemberDialog", () => {
  const onOpenChange = vi.fn();
  const onInvited = vi.fn().mockResolvedValue(undefined);
  const organizationId = "org_test";

  const getDialog = () => {
    const dialog = screen.getAllByTestId("invite-member-dialog").at(-1);
    expect(dialog).toBeDefined();
    return dialog as HTMLElement;
  };

  const getLastRoleOption = (value: string) => {
    const option = screen.getAllByTestId(`invite-member-role-option-${value}`).at(-1);
    expect(option).toBeDefined();
    return option as HTMLElement;
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invites a new member with the member role", async () => {
    const user = userEvent.setup();
    inviteUserToOrganization.mockResolvedValue(undefined);

    render(
      <InviteMemberDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        onInvited={onInvited}
      />,
    );

    const dialog = getDialog();
    await user.type(within(dialog).getByTestId("invite-member-email-input"), "member@example.com");
    await user.click(within(dialog).getByTestId("invite-member-submit-button"));

    await waitFor(() => {
      expect(inviteUserToOrganization).toHaveBeenCalledWith({
        organizationId,
        email: "member@example.com",
        role: "MEMBER",
      });
    });
    expect(inviteUserWithPrincipalGrants).not.toHaveBeenCalled();
    expect(createPractitioner).not.toHaveBeenCalled();
  });

  it("invites a new manager (power user role)", async () => {
    const user = userEvent.setup();
    inviteUserToOrganization.mockResolvedValue(undefined);

    render(
      <InviteMemberDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        onInvited={onInvited}
      />,
    );

    const dialog = getDialog();
    await user.type(within(dialog).getByTestId("invite-member-email-input"), "manager@example.com");
    await user.click(within(dialog).getByTestId("invite-member-role-trigger"));
    await user.click(getLastRoleOption("power_user"));
    await user.click(within(dialog).getByTestId("invite-member-submit-button"));

    await waitFor(() => {
      expect(inviteUserToOrganization).toHaveBeenCalledWith({
        organizationId,
        email: "manager@example.com",
        role: "POWER_USER",
      });
    });
  });

  it("creates a practitioner and invites with principal grants when practitioner access is enabled", async () => {
    const user = userEvent.setup();
    createPractitioner.mockResolvedValue({ id: "prac_new" });
    inviteUserWithPrincipalGrants.mockResolvedValue(undefined);

    render(
      <InviteMemberDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        onInvited={onInvited}
      />,
    );

    const dialog = getDialog();
    await user.type(
      within(dialog).getByTestId("invite-member-email-input"),
      "clinical@example.com",
    );
    await user.click(within(dialog).getByTestId("invite-member-practitioner-checkbox"));
    const given = within(dialog).getByTestId("invite-member-practitioner-given-name-input");
    const family = within(dialog).getByTestId("invite-member-practitioner-family-name-input");
    await user.type(given, "Jane");
    await user.type(family, "Doe");
    await user.click(within(dialog).getByTestId("invite-member-submit-button"));

    await waitFor(() => {
      expect(createPractitioner).toHaveBeenCalledWith(organizationId, {
        givenName: "Jane",
        familyName: "Doe",
        birthDate: "",
      });
      expect(inviteUserWithPrincipalGrants).toHaveBeenCalledWith({
        organizationId,
        email: "clinical@example.com",
        role: "MEMBER",
        principalGrants: [{ principalType: "PRACTITIONER", principalId: "prac_new" }],
      });
    });
    expect(inviteUserToOrganization).not.toHaveBeenCalled();
  });

  it("allows inviting a manager as a practitioner", async () => {
    const user = userEvent.setup();
    createPractitioner.mockResolvedValue({ id: "prac_mgr" });
    inviteUserWithPrincipalGrants.mockResolvedValue(undefined);

    render(
      <InviteMemberDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        onInvited={onInvited}
      />,
    );

    const dialog = getDialog();
    await user.type(
      within(dialog).getByTestId("invite-member-email-input"),
      "mgr+prac@example.com",
    );
    await user.click(within(dialog).getByTestId("invite-member-role-trigger"));
    await user.click(getLastRoleOption("power_user"));
    await user.click(within(dialog).getByTestId("invite-member-practitioner-checkbox"));
    const given = within(dialog).getByTestId("invite-member-practitioner-given-name-input");
    const family = within(dialog).getByTestId("invite-member-practitioner-family-name-input");
    await user.type(given, "Pat");
    await user.type(family, "Lee");
    await user.click(within(dialog).getByTestId("invite-member-submit-button"));

    await waitFor(() => {
      expect(inviteUserWithPrincipalGrants).toHaveBeenCalledWith({
        organizationId,
        email: "mgr+prac@example.com",
        role: "POWER_USER",
        principalGrants: [{ principalType: "PRACTITIONER", principalId: "prac_mgr" }],
      });
    });
  });
});
