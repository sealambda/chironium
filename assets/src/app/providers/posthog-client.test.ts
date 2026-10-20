import type { CaptureResult } from "posthog-js";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { init: vi.fn() } }));

describe("posthog client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

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

  // posthog-js sends the stored initial URL as `person_properties` on every /flags
  // request, which skips before_send, so the real client must mask it when storing.
  it("keeps invite codes out of the stored initial person info", async () => {
    vi.resetModules();
    vi.doUnmock("posthog-js");
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const code = "ABCDEFGH";
    globalThis.history.replaceState(null, "", `/app?inviteCode=${code}`);

    const { posthog } = await import("@/app/providers/posthog-client");
    // capture() calls this on the first $pageview.
    posthog.persistence?.set_initial_person_info();

    const initialProps = posthog.persistence?.get_initial_props() ?? {};
    expect(initialProps.$initial_current_url).toBeDefined();
    expect(JSON.stringify(initialProps)).not.toContain(code);
  });
});
