import { cleanup, render, screen } from "@testing-library/react";
import { BellRing } from "lucide-react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NavItemLink } from "@/shared/layout/side-nav";

vi.mock("@tanstack/react-router", () => ({
  // biome-ignore lint/style/useNamingConvention: mocks the exported component name.
  Link: ({ children, ...props }: { children: ReactNode; "aria-label"?: string; to: string }) => (
    <a href={props.to} aria-label={props["aria-label"]}>
      {children}
    </a>
  ),
  useRouterState: vi.fn(),
}));

const pendingItem = {
  to: "/pending",
  label: () => "Pending",
  icon: BellRing,
  showsPendingCount: true,
};

describe("NavItemLink", () => {
  afterEach(cleanup);

  it("shows the pending count and names it for screen readers", () => {
    render(
      <NavItemLink item={pendingItem} currentPath="/customers" pendingCount={7} variant="mobile" />,
    );

    expect(screen.getByTestId("nav-pending-count")).toHaveTextContent("7");
    expect(screen.getByRole("link", { name: "Pending items: 7" })).toBeVisible();
  });

  it("hides the count at zero", () => {
    render(
      <NavItemLink item={pendingItem} currentPath="/customers" pendingCount={0} variant="mobile" />,
    );

    expect(screen.queryByTestId("nav-pending-count")).toBeNull();
    expect(screen.getByRole("link", { name: "Pending" })).toBeVisible();
  });

  it("shows no count on other items", () => {
    render(
      <NavItemLink
        item={{ ...pendingItem, showsPendingCount: false }}
        currentPath="/customers"
        pendingCount={3}
        variant="mobile"
      />,
    );

    expect(screen.queryByTestId("nav-pending-count")).toBeNull();
  });
});
