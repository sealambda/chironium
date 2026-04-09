import type { APIRequestContext, Browser } from "@playwright/test";

export const defaultLocalPlaywrightSecret = "local-playwright-e2e-secret-do-not-use-in-prod";

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
