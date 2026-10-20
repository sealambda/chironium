import type { CaptureResult } from "posthog-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { init: vi.fn() } }));

describe("posthog client", () => {
  it("masks invite codes in every captured URL before sending", async () => {
    const posthog = (await import("posthog-js")).default;
    await import("@/app/providers/posthog-client");

    const beforeSend = vi.mocked(posthog.init).mock.calls[0]?.[1]?.before_send;
    if (typeof beforeSend !== "function") {
      throw new Error("Expected a before_send hook.");
    }

    const code = "ABCDEFGH";
    const host = "https://chironium.test";
    const timestamp = new Date();
    // biome-ignore-start lint/style/useNamingConvention: PostHog property names.
    const event = {
      event: "$pageview",
      timestamp,
      properties: {
        $current_url: `${host}/app/customers?inviteCode=${code}&tab=1`,
        $referrer: `${host}/auth?returnTo=%2Fapp%3FinviteCode%3D${code}`,
      },
      $set_once: { $initial_current_url: `${host}/app?inviteCode=${code}` },
    } as unknown as CaptureResult;
    // biome-ignore-end lint/style/useNamingConvention: PostHog property names.

    const sent = beforeSend(event);

    expect(JSON.stringify(sent)).not.toContain(code);
    expect(sent?.properties.$current_url).toBe(`${host}/app/customers?inviteCode=<MASKED>&tab=1`);
    expect(sent?.timestamp).toBe(timestamp);
  });
});
