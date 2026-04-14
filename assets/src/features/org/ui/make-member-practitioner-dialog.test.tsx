import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MakeMemberPractitionerDialog } from "@/features/org/ui/make-member-practitioner-dialog";

const { createPrincipalGrant, createPractitioner } = vi.hoisted(() => ({
  createPrincipalGrant: vi.fn(),
  createPractitioner: vi.fn(),
}));

vi.mock("@/features/org/api/org-api", () => ({
  createPrincipalGrant,
}));

vi.mock("@/features/practitioners/api/practitioners-api", () => ({
  createPractitioner,
}));

describe("MakeMemberPractitionerDialog", () => {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn().mockResolvedValue(undefined);
  const organizationId = "org_test";

  const getDialog = () => {
    const dialog = screen.getAllByTestId("make-practitioner-dialog").at(-1);
    expect(dialog).toBeDefined();
    return dialog as HTMLElement;
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a practitioner and links an existing member user", async () => {
    const user = userEvent.setup();
    createPractitioner.mockResolvedValue({ id: "prac_9" });
    createPrincipalGrant.mockResolvedValue(undefined);

    render(
      <MakeMemberPractitionerDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        target={{ type: "user", userId: "user_42" }}
        onSaved={onSaved}
      />,
    );

    const dialog = getDialog();
    const given = within(dialog).getByTestId("make-practitioner-given-name-input");
    const family = within(dialog).getByTestId("make-practitioner-family-name-input");
    await user.type(given, "Sam");
    await user.type(family, "River");
    await user.click(within(dialog).getByTestId("make-practitioner-submit-button"));

    await waitFor(() => {
      expect(createPractitioner).toHaveBeenCalledWith(organizationId, {
        givenName: "Sam",
        familyName: "River",
        birthDate: "",
      });
      expect(createPrincipalGrant).toHaveBeenCalledWith({
        organizationId,
        userId: "user_42",
        principalType: "PRACTITIONER",
        principalId: "prac_9",
      });
    });
  });

  it("links a pending invitation to a new practitioner", async () => {
    const user = userEvent.setup();
    createPractitioner.mockResolvedValue({ id: "prac_inv" });
    createPrincipalGrant.mockResolvedValue(undefined);

    render(
      <MakeMemberPractitionerDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        target={{ type: "invitation", invitationId: "inv_7" }}
        onSaved={onSaved}
      />,
    );

    const dialog = getDialog();
    const given = within(dialog).getByTestId("make-practitioner-given-name-input");
    const family = within(dialog).getByTestId("make-practitioner-family-name-input");
    await user.type(given, "Alex");
    await user.type(family, "Kim");
    await user.click(within(dialog).getByTestId("make-practitioner-submit-button"));

    await waitFor(() => {
      expect(createPrincipalGrant).toHaveBeenCalledWith({
        organizationId,
        invitationId: "inv_7",
        principalType: "PRACTITIONER",
        principalId: "prac_inv",
      });
    });
  });
});
