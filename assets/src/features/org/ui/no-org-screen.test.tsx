import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NoOrgScreen } from "@/features/org/ui/no-org-screen";
import * as m from "@/paraglide/messages";

const { config } = vi.hoisted(() => ({ config: { demo: false } }));

vi.mock("@/shared/utils/runtime-config", () => ({ runtimeConfig: config }));

function renderScreen() {
  render(<NoOrgScreen onCreateOrgClick={vi.fn()} onJoinOrgClick={vi.fn()} />);
}

describe("NoOrgScreen", () => {
  afterEach(() => {
    cleanup();
    document.head.querySelector("meta[name='csrf-token']")?.remove();
  });

  it("offers to create or join an organization outside demo mode", () => {
    config.demo = false;
    renderScreen();

    expect(screen.getByText(m.org_no_access_title())).toBeVisible();
    expect(screen.getByTestId("no-org-create-organization-button")).toBeVisible();
    expect(screen.getByTestId("no-org-join-by-invitation-button")).toBeVisible();
    expect(screen.queryByTestId("no-org-start-demo-button")).toBeNull();
  });

  it("says the demo ended and offers only a new one", () => {
    config.demo = true;
    renderScreen();

    expect(screen.getByText(m.demo_ended_title())).toBeVisible();
    expect(screen.getByRole("button", { name: m.demo_start_new() })).toBeVisible();
    expect(screen.queryByTestId("no-org-join-by-invitation-button")).toBeNull();
    expect(screen.queryByTestId("no-org-create-organization-button")).toBeNull();
  });

  it("posts a new demo with the page's CSRF token", async () => {
    config.demo = true;
    const meta = document.createElement("meta");
    meta.name = "csrf-token";
    meta.content = "the-csrf-token";
    document.head.append(meta);
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
    renderScreen();

    await userEvent.click(screen.getByTestId("no-org-start-demo-button"));

    expect(submit).toHaveBeenCalledOnce();
    const form = submit.mock.contexts[0] as HTMLFormElement;
    expect(form.method).toBe("post");
    expect(new URL(form.action).pathname).toBe("/demo");
    expect(new FormData(form).get("_csrf_token")).toBe("the-csrf-token");
  });
});
