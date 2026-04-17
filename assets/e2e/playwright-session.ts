import type { APIRequestContext, Browser } from "@playwright/test";

const DEFAULT_PLAYWRIGHT_BASE_URL = "http://localhost:4000";
const DEFAULT_PLAYWRIGHT_E2E_SECRET = "local-playwright-e2e-secret-do-not-use-in-prod";

export function getPlaywrightE2EEnv(): { baseURL: string; secret: string } {
  const env = globalThis.process.env;

  return {
    baseURL: env.PLAYWRIGHT_BASE_URL ?? DEFAULT_PLAYWRIGHT_BASE_URL,
    secret: env.PLAYWRIGHT_E2E_SECRET ?? DEFAULT_PLAYWRIGHT_E2E_SECRET,
  };
}

export async function devPlaywrightEnsureUser(
  request: APIRequestContext,
  params: { baseURL: string; secret: string; email: string },
): Promise<void> {
  const res = await request.post(`${params.baseURL}/dev/playwright/user`, {
    headers: {
      "content-type": "application/json",
      "x-playwright-e2e-secret": params.secret,
    },
    data: { email: params.email },
  });
  if (!res.ok()) {
    throw new Error(`ensure user failed for ${params.email}: ${res.status()} ${await res.text()}`);
  }
}

export async function devPlaywrightSession(
  request: APIRequestContext,
  params: { baseURL: string; secret: string; email: string },
): Promise<void> {
  const res = await request.post(`${params.baseURL}/dev/playwright/session`, {
    headers: {
      "content-type": "application/json",
      "x-playwright-e2e-secret": params.secret,
    },
    data: { email: params.email },
  });
  if (!res.ok()) {
    throw new Error(
      `session bootstrap failed for ${params.email}: ${res.status()} ${await res.text()}`,
    );
  }
}

export async function devPlaywrightInvitationCode(
  request: APIRequestContext,
  params: { baseURL: string; secret: string; email: string },
): Promise<string> {
  const res = await request.post(`${params.baseURL}/dev/playwright/invitation-code`, {
    headers: {
      "content-type": "application/json",
      "x-playwright-e2e-secret": params.secret,
    },
    data: { email: params.email },
  });
  if (!res.ok()) {
    throw new Error(
      `invitation code lookup failed for ${params.email}: ${res.status()} ${await res.text()}`,
    );
  }

  const data = (await res.json()) as { inviteCode?: string };
  if (!data.inviteCode || data.inviteCode.trim() === "") {
    throw new Error(`invitation code missing in response for ${params.email}`);
  }
  return data.inviteCode;
}

/** Writes storage state after creating a server-side session for the given email. */
export async function writeStorageState(
  browser: Browser,
  params: {
    baseURL: string;
    secret: string;
    email: string;
    outPath: string;
  },
): Promise<void> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const sessionRes = await page.request.post(`${params.baseURL}/dev/playwright/session`, {
    headers: {
      "content-type": "application/json",
      "x-playwright-e2e-secret": params.secret,
    },
    data: { email: params.email },
  });
  if (!sessionRes.ok()) {
    await ctx.close();
    throw new Error(
      `Session bootstrap failed for ${params.email}: ${sessionRes.status()} ${await sessionRes.text()}`,
    );
  }

  await page.goto(`${params.baseURL}/app`);
  await page.waitForLoadState("domcontentloaded");
  await ctx.storageState({ path: params.outPath });
  await ctx.close();
}
