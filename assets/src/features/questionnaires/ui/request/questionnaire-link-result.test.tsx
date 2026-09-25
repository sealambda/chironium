import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuestionnaireLink } from "@/features/questionnaires/api/questionnaire-requests-api";
import { QuestionnaireLinkResult } from "@/features/questionnaires/ui/request/questionnaire-link-result";
import * as m from "@/paraglide/messages";

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("sonner", () => ({ toast }));

const LINK: QuestionnaireLink = {
  taskId: "task-1",
  url: "https://example.test/portal/link?token=secret",
  emailSent: false,
  expiresAt: "2026-10-02T12:00:00.000Z",
  questionnaireTitle: "Intake",
};

describe("QuestionnaireLinkResult", () => {
  afterEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(navigator, "share");
  });

  it("copies the link without putting it in the toast", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(<QuestionnaireLinkResult link={LINK} />);

    expect(screen.getByRole("textbox")).toHaveValue(LINK.url);
    await user.click(screen.getByRole("button", { name: m.questionnaire_link_copy() }));

    expect(writeText).toHaveBeenCalledWith(LINK.url);
    expect(toast.success).toHaveBeenCalledWith(m.questionnaire_link_copied());
  });

  it("shows the email note only when the link was emailed", () => {
    const { rerender } = render(<QuestionnaireLinkResult link={LINK} />);
    expect(screen.queryByText(m.questionnaire_link_email_sent())).not.toBeInTheDocument();

    rerender(<QuestionnaireLinkResult link={{ ...LINK, emailSent: true }} />);
    expect(screen.getByText(m.questionnaire_link_email_sent())).toBeInTheDocument();
  });

  it("offers Share only where the browser supports it, and ignores a dismissed sheet", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<QuestionnaireLinkResult link={LINK} />);
    expect(
      screen.queryByRole("button", { name: m.questionnaire_link_share() }),
    ).not.toBeInTheDocument();
    unmount();

    const share = vi.fn().mockRejectedValue(new DOMException("Dismissed", "AbortError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<QuestionnaireLinkResult link={LINK} />);

    await user.click(screen.getByRole("button", { name: m.questionnaire_link_share() }));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: LINK.url }));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
