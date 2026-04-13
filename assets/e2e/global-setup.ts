import { chromium, type FullConfig, request } from "@playwright/test";

import { devPlaywrightEnsureUser, writeStorageState } from "./playwright-session";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000";
  const secret = process.env.PLAYWRIGHT_E2E_SECRET;
  if (!secret) {
    throw new Error("PLAYWRIGHT_E2E_SECRET environment variable must be set.");
  }
  const ownerEmail = process.env.E2E_OWNER_EMAIL ?? "e2e-owner@local.test";

  const authDir = path.join(rootDir, ".auth");
  mkdirSync(authDir, { recursive: true });

  const req = await request.newContext({ baseURL });
  try {
    await devPlaywrightEnsureUser(req, { baseURL, secret, email: ownerEmail });
  } finally {
    await req.dispose();
  }

  const browser = await chromium.launch();

  try {
    await writeStorageState(browser, {
      baseURL,
      secret,
      email: ownerEmail,
      outPath: path.join(authDir, "owner.json"),
    });
  } finally {
    await browser.close();
  }
}
