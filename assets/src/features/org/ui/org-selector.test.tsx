import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrgSelector } from "@/features/org/ui/org-selector";

const { config } = vi.hoisted(() => ({ config: { demo: false } }));

vi.mock("@/shared/utils/runtime-config", () => ({ runtimeConfig: config }));

async function openSelector() {
  render(
    <OrgSelector
      selectedOrg={null}
      availableOrgs={[]}
      onSelectOrg={vi.fn()}
      onCreateClick={vi.fn()}
      onJoinClick={vi.fn()}
    />,
  );
  await userEvent.click(screen.getByTestId("org-selector-trigger"));
  await screen.findByTestId("org-selector-join-by-invitation-button");
}

describe("OrgSelector", () => {
  afterEach(cleanup);

  it("offers to create an organization outside demo mode", async () => {
    config.demo = false;
    await openSelector();

    expect(screen.getByTestId("org-selector-create-button")).toBeVisible();
  });

  it("hides creating an organization in demo mode, but keeps joining one", async () => {
    config.demo = true;
    await openSelector();

    expect(screen.queryByTestId("org-selector-create-button")).toBeNull();
    expect(screen.getByTestId("org-selector-join-by-invitation-button")).toBeVisible();
  });
});
