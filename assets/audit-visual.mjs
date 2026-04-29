import path from "node:path";

import {
  buildRunPaths,
  captureOverlay,
  discoverCustomerIds,
  domInventory,
  launchBrowser,
  navigate,
  openPage,
  requireAuthState,
  saveReport,
  snapViewports,
} from "./audit-lib.mjs";

const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:4000";
const AUTH_STATE_OVERRIDE = process.env.AUDIT_AUTH_STATE;

function urlFor(pathname) {
  return new URL(pathname, BASE_URL).toString();
}

const TARGETS = {
  customers: urlFor("/customers"),
};

const runPaths = buildRunPaths();
const authState = requireAuthState({ preferredPath: AUTH_STATE_OVERRIDE });
const browser = await launchBrowser({ headless: true });

const runReport = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  authState,
  runId: runPaths.runId,
  targets: [],
  customerIds: [],
  errors: [],
};

try {
  const { context, page } = await openPage(browser, {
    storageState: authState,
    baseURL: BASE_URL,
  });

  try {
    await navigate(page, TARGETS.customers);

    const customerTarget = {
      url: TARGETS.customers,
      kind: "customers-list",
      screenshots: await snapViewports(page, {
        label: "customers-list",
        outDir: runPaths.screenshotsDir,
      }),
      overlays: await captureOverlay(page, {
        label: "customers-list",
        outDir: runPaths.screenshotsDir,
      }),
      domInventory: await domInventory(page),
    };

    runReport.targets.push(customerTarget);

    const customerIds = await discoverCustomerIds(page);
    runReport.customerIds = customerIds;

    for (const customerId of customerIds.slice(0, 3)) {
      const detailUrl = urlFor(`/customers/${customerId}`);
      await navigate(page, detailUrl);

      const detailTarget = {
        url: detailUrl,
        kind: "customer-detail",
        customerId,
        screenshots: await snapViewports(page, {
          label: `customer-${customerId}`,
          outDir: runPaths.screenshotsDir,
        }),
        overlays: await captureOverlay(page, {
          label: `customer-${customerId}`,
          outDir: runPaths.screenshotsDir,
        }),
        domInventory: await domInventory(page),
      };

      runReport.targets.push(detailTarget);
    }
  } finally {
    await context.close();
  }
} catch (error) {
  runReport.errors.push({
    message: error instanceof Error ? error.message : String(error),
  });
} finally {
  await browser.close();
}

const jsonReportPath = saveReport(runReport, {
  outDir: runPaths.reportsDir,
  filename: "audit-visual-report.json",
});

const summaryPath = saveReport(
  {
    summary: {
      runId: runPaths.runId,
      baseUrl: BASE_URL,
      targets: runReport.targets.map((target) => ({
        url: target.url,
        kind: target.kind,
        customerId: target.customerId,
        screenshotCount: target.screenshots.length,
        overlayCount: target.overlays.length,
      })),
      customerIds: runReport.customerIds,
      errors: runReport.errors,
      jsonReportPath,
    },
  },
  {
    outDir: runPaths.reportsDir,
    filename: "audit-visual-summary.json",
  },
);

console.info("[audit:visual] Run complete.");
console.info(`[audit:visual] Screenshots: ${runPaths.screenshotsDir}`);
console.info(`[audit:visual] Report: ${jsonReportPath}`);
console.info(`[audit:visual] Summary: ${summaryPath}`);
if (runReport.errors.length > 0) {
  console.error("[audit:visual] Errors captured:", runReport.errors);
}
