import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditMemberRoleDialog } from "@/features/org/ui/edit-member-role-dialog";

const updateOrganizationUserRole = vi.hoisted(() => vi.fn());

vi.mock("@/features/org/api/org-api", () => ({
  updateOrganizationUserRole,
}));

describe("EditMemberRoleDialog", () => {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn().mockResolvedValue(undefined);
  const organizationId = "org_test";

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("changes role from manager to member", async () => {
    const user = userEvent.setup();
    updateOrganizationUserRole.mockResolvedValue(undefined);

    render(
      <EditMemberRoleDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        target={{ organizationUserId: "ou_1", initialRole: "POWER_USER" }}
        onSaved={onSaved}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /edit member role/i });
    await user.click(within(dialog).getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Member" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateOrganizationUserRole).toHaveBeenCalledWith({
        organizationId,
        organizationUserId: "ou_1",
        role: "MEMBER",
      });
    });
    expect(onSaved).toHaveBeenCalled();
  });
});
