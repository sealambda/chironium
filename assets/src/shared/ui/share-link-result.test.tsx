import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as m from "@/paraglide/messages";
import { ShareLinkResult } from "@/shared/ui/share-link-result";

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("sonner", () => ({ toast }));

const URL = "https://example.test/portal/link?token=secret";
const LABEL = "Questionnaire link";

function renderResult() {
  return render(
    <ShareLinkResult url={URL} label={LABEL} shareTitle="Intake" shareText="Fill this in">
      <li>A note</li>
    </ShareLinkResult>,
  );
}

describe("ShareLinkResult", () => {
  afterEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(navigator, "share");
  });

  it("copies the link without putting it in the toast", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    renderResult();

    expect(screen.getByRole("textbox")).toHaveValue(URL);
    expect(screen.getByText("A note")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `${m.share_link_copy()} ${LABEL}` }));

    expect(writeText).toHaveBeenCalledWith(URL);
    expect(toast.success).toHaveBeenCalledWith(m.share_link_copied());
    expect(JSON.stringify(toast.success.mock.calls)).not.toContain("secret");
  });

  it("offers Share only where the browser supports it, and ignores a dismissed sheet", async () => {
    const user = userEvent.setup();
    const { unmount } = renderResult();
    expect(screen.queryByRole("button", { name: m.share_link_share() })).not.toBeInTheDocument();
    unmount();

    const share = vi.fn().mockRejectedValue(new DOMException("Dismissed", "AbortError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderResult();

    await user.click(screen.getByRole("button", { name: m.share_link_share() }));

    expect(share).toHaveBeenCalledWith({ title: "Intake", text: "Fill this in", url: URL });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
