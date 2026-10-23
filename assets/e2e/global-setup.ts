import { chromium, type FullConfig, request } from "@playwright/test";

import {
  devPlaywrightEnsureUser,
  getPlaywrightE2EEnv,
  writeStorageState,
} from "./playwright-session";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const VITE_URL = "http://localhost:5173";
const VITE_READY_TIMEOUT_MS = 60_000;

/**
 * Phoenix starts Vite as a watcher, so the webServer check (Phoenix's /robots.txt) can pass
 * before Vite listens. Pages loaded in that window fail to fetch the SPA bundle and render blank.
 */
async function waitForVite(): Promise<void> {
  const deadline = Date.now() + VITE_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${VITE_URL}/@vite/client`)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Vite dev server at ${VITE_URL} did not respond within ${VITE_READY_TIMEOUT_MS} ms.`,
  );
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const { baseURL, secret } = getPlaywrightE2EEnv();
  const ownerEmail = globalThis.process.env.E2E_OWNER_EMAIL ?? "e2e-owner@local.test";

  const authDir = path.join(rootDir, ".auth");
  mkdirSync(authDir, { recursive: true });

  await waitForVite();

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
