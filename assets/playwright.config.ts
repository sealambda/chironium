import { defineConfig, devices } from "@playwright/test";

import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const playwrightSecret =
  process.env.PLAYWRIGHT_E2E_SECRET ?? "local-playwright-e2e-secret-do-not-use-in-prod";

/**
 * E2E runs against the Phoenix origin (session cookies); the SPA lives under `/app/*`.
 *
 * Prerequisite: `pnpm --dir assets e2e:install` (once).
 * Global setup creates an owner session; scenarios create orgs, invitations, and customers in-flow.
 *
 * Default local secret matches dev.exs when `PLAYWRIGHT_E2E_SECRET` is unset (see global-setup).
 */
export default defineConfig({
  testDir: path.join(rootDir, "e2e"),
  globalSetup: path.join(rootDir, "e2e/global-setup.ts"),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: path.join(rootDir, "playwright-report"), open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000",
    ...devices["Desktop Chrome"],
    headless: true,
    locale: "en-US",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    extraHTTPHeaders: {
      "x-playwright-e2e-secret": playwrightSecret,
    },
  },
  projects: [
    {
      name: "auth-smoke",
      testMatch: /sign-in\.spec\.ts$/,
    },
    {
      name: "e2e",
      dependencies: ["auth-smoke"],
      testIgnore: [/sign-in\.spec\.ts$/],
      use: {
        storageState: path.join(rootDir, "e2e/.auth/owner.json"),
      },
    },
  ],
  webServer: {
    command: `MIX_ENV=dev PLAYWRIGHT_E2E_SECRET="${playwrightSecret}" mix phx.server`,
    cwd: path.join(rootDir, ".."),
    url: `${process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000"}/robots.txt`,
    reuseExistingServer: true,
    timeout: 100_000,
  },
});
