import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PendingInvitationsDialog } from "@/features/org/ui/pending-invitations-dialog";
import * as m from "@/paraglide/messages";
import { MutationError } from "@/shared/api/error-utils";
import { renderWithQueryClient } from "@/test/render-with-query-client";

const { acceptInvitation, rejectInvitation, toastError } = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  rejectInvitation: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/features/org/api/org-api", () => ({ acceptInvitation, rejectInvitation }));
vi.mock("@/shared/session/use-org", () => ({
  useOrg: () => ({ refreshOrgs: vi.fn(), selectOrg: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }));

function renderDialog() {
  renderWithQueryClient(<PendingInvitationsDialog open initialInviteCode="OLDCODE1" />);
}

describe("PendingInvitationsDialog errors", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the translated fallback, not the server's English text, for a renewed code", async () => {
    acceptInvitation.mockRejectedValue(new MutationError("could not be found", []));
    renderDialog();

    await userEvent.click(screen.getByTestId("invitation-accept-button"));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(m.org_invitation_accept_error()));
  });

  it("shows the translated wrong-account text when rejecting someone else's invitation", async () => {
    rejectInvitation.mockRejectedValue(
      new MutationError("This manager invitation was sent to a different email address.", [
        "email",
      ]),
    );
    renderDialog();

    await userEvent.click(screen.getByTestId("invitation-reject-button"));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(m.org_invitation_wrong_account()));
  });
});
