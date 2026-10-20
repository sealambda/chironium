import { expect, test } from "@playwright/test";

import {
  bootstrapSession,
  createCustomer,
  createOrg,
  openCustomerDetail,
  TIMEOUT_MS,
} from "./helpers";

test("a reminder due today shows on the Pending page until it is done", async ({ page }) => {
  test.setTimeout(180_000);

  const runId = Date.now().toString();
  const fullName = "Rita Reminder";
  const description = `Call about results ${runId}`;

  await bootstrapSession(page, `e2e-pending-${runId}@local.test`);
  await createOrg(page, `E2E Pending Org ${runId}`);
  await createCustomer(page, fullName);
  await openCustomerDetail(page, fullName);

  const addRecordButton = page.getByTestId("add-record-button").first();
  await expect(addRecordButton).toBeVisible({ timeout: TIMEOUT_MS });
  await addRecordButton.click();
  await page.getByTestId("add-record-tile-reminder").click();

  const dialog = page.getByRole("dialog", { name: "Add reminder" });
  await expect(dialog).toBeVisible({ timeout: TIMEOUT_MS });
  await dialog.getByRole("button", { name: "Date" }).click();
  // Calendar day buttons carry the browser's own short date.
  const today = await page.evaluate(() => new Date().toLocaleDateString());
  await page.locator(`[data-day="${today}"]`).click();
  await dialog.getByPlaceholder("What should we remind you about?").fill(description);
  await dialog.getByRole("button", { name: "Add reminder" }).click();
  await expect(page.getByText("Reminder set.")).toBeVisible({ timeout: TIMEOUT_MS });
  // The patient page hides the main navigation; going back shows it again.
  await page.getByRole("button", { name: "Back" }).click();

  const navLink = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", {
    name: /^Pending/,
  });
  await expect(navLink).toHaveAccessibleName("Pending items: 1", { timeout: TIMEOUT_MS });
  await navLink.click();

  await expect(page).toHaveURL(/\/app\/pending$/, { timeout: TIMEOUT_MS });
  const row = page.getByTestId("pending-row").filter({ hasText: description });
  await expect(row).toBeVisible({ timeout: TIMEOUT_MS });
  await expect(row.getByRole("link", { name: fullName })).toBeVisible();

  await row.getByRole("button", { name: "Mark as done" }).click();
  await expect(page.getByText("Reminder marked as done.")).toBeVisible({ timeout: TIMEOUT_MS });
  await expect(row).toHaveCount(0, { timeout: TIMEOUT_MS });
  await expect(page.getByText("Nothing pending")).toBeVisible();
  await expect(navLink).toHaveAccessibleName("Pending");
  await expect(page.getByTestId("nav-pending-count")).toHaveCount(0);
});
