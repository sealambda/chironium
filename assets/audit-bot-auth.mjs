/**
 * One-time auth bootstrap for autonomous review sessions.
 *
 * Calls the server-side session endpoint to create an authenticated session,
 * then captures the resulting browser storage state to
 * `assets/e2e/.auth/review-bot.json`. The Playwright MCP server is configured
 * to load this file at startup, so review agents have an authenticated browser
 * without any manual login step.
 *
 * Usage:
 *   pnpm --dir assets audit:auth:bot
 *
 * Prerequisites:
 *   - Local dev server running (default: http://localhost:4000).
 *   - PLAYWRIGHT_E2E_SECRET env var set, or the default development secret is
 *     acceptable for your environment.
 *
 * Re-run whenever the session expires or the review-bot account is recreated.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "e2e/.auth");
const OUT_PATH = path.join(AUTH_DIR, "review-bot.json");

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000";
const SECRET =
  process.env.PLAYWRIGHT_E2E_SECRET ?? "local-playwright-e2e-secret-do-not-use-in-prod";
const EMAIL = process.env.REVIEW_BOT_EMAIL ?? "review-bot@local.test";

mkdirSync(AUTH_DIR, { recursive: true });

// Ensure the review-bot user account exists before bootstrapping a session.
const ensureRes = await fetch(`${BASE_URL}/dev/playwright/user`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-playwright-e2e-secret": SECRET },
  body: JSON.stringify({ email: EMAIL }),
});
if (!ensureRes.ok) {
  throw new Error(`User setup failed: ${ensureRes.status} ${await ensureRes.text()}`);
}

// Bootstrap the session through a browser context so the response cookies are
// captured in the storage state rather than only in Node's fetch cookie jar.
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();

  const sessionRes = await page.request.post(`${BASE_URL}/dev/playwright/session`, {
    headers: { "content-type": "application/json", "x-playwright-e2e-secret": SECRET },
    data: { email: EMAIL },
  });
  if (!sessionRes.ok()) {
    throw new Error(`Session bootstrap failed: ${sessionRes.status()} ${await sessionRes.text()}`);
  }

  // Navigate to the app so the session cookie is confirmed as active before
  // persisting the state.
  await page.goto(`${BASE_URL}/app`, { waitUntil: "domcontentloaded" });
  await context.storageState({ path: OUT_PATH });
  await context.close();
} finally {
  await browser.close();
}

console.info(`[audit:auth:bot] Auth state written to ${OUT_PATH}`);
