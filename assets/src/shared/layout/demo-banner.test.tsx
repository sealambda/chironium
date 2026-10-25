import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as m from "@/paraglide/messages";
import { DemoBanner } from "@/shared/layout/demo-banner";

const { config } = vi.hoisted(() => ({ config: { demo: false } }));

vi.mock("@/shared/utils/runtime-config", () => ({ runtimeConfig: config }));

describe("DemoBanner", () => {
  afterEach(cleanup);

  it("renders in demo mode, with the Sealambda link", () => {
    config.demo = true;
    render(<DemoBanner />);

    expect(screen.getByTestId("demo-banner")).toHaveTextContent(m.demo_banner());
    const link = screen.getByRole("link", { name: m.demo_made_by() });
    expect(link).toHaveAttribute("href", "https://sealambda.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders nothing outside demo mode", () => {
    config.demo = false;
    render(<DemoBanner />);

    expect(screen.queryByTestId("demo-banner")).toBeNull();
  });
});
