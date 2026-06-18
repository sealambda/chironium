import { expect, type Page, test } from "@playwright/test";

import { TIMEOUT_MS } from "./helpers";
import {
  devPlaywrightEnsureUser,
  devPlaywrightSession,
  getPlaywrightE2EEnv,
} from "./playwright-session";

async function bootstrapSession(page: Page, email: string) {
  const { baseURL, secret } = getPlaywrightE2EEnv();

  await devPlaywrightEnsureUser(page.request, { baseURL, secret, email });
  await devPlaywrightSession(page.request, { baseURL, secret, email });
}

async function createOrgWithPlan(page: Page, runId: string) {
  const orgName = `E2E Optional Org ${runId}`;

  await page.goto("/app/settings");

  await Promise.race([
    expect(page.getByTestId("no-org-create-organization-button")).toBeVisible({
      timeout: TIMEOUT_MS,
    }),
    expect(page.getByTestId("settings-heading")).toBeVisible({
      timeout: TIMEOUT_MS,
    }),
  ]);

  if (await page.getByTestId("no-org-create-organization-button").isVisible()) {
    await page.getByTestId("no-org-create-organization-button").click();
  } else {
    await page.getByTestId("org-selector-trigger").click();
    await page.getByTestId("org-selector-create-button").click();
  }

  const dialog = page.getByTestId("create-org-dialog");
  await expect(dialog).toBeVisible({ timeout: TIMEOUT_MS });

  await dialog.getByTestId("create-org-name-input").fill(orgName);
  await dialog.getByTestId("create-org-next-button").click();

  await dialog.getByTestId("create-org-plan-name-input").fill("Monthly");
  await dialog.getByTestId("create-org-plan-duration-value-input").fill("1");
  await dialog.getByTestId("create-org-plan-duration-unit-trigger").click();
  await page.getByRole("option").first().click();
  await dialog.getByTestId("create-org-add-plan-button").click();
  await dialog.getByTestId("create-org-finish-button").click();

  await expect(page.getByTestId("toast-organization-created")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
}

async function openOnboarding(page: Page) {
  await page.goto("/app/customers");
  await expect(page.getByTestId("customers-heading")).toBeVisible({
    timeout: TIMEOUT_MS,
  });

  await page.getByTestId("customers-new-button-header").click();
  const dialog = page.getByTestId("customer-onboarding-dialog");
  await expect(dialog).toBeVisible({ timeout: TIMEOUT_MS });

  return dialog;
}

async function completePersonalStep(dialog: ReturnType<Page["getByTestId"]>, fullName: string) {
  const [givenName, familyName] = fullName.split(" ");

  await dialog.getByTestId("onboarding-given-name-input").fill(givenName);
  await dialog.getByTestId("onboarding-family-name-input").fill(familyName);
  await dialog.getByTestId("onboarding-next-button").click();
}

async function createCustomerSkippingOptional(page: Page, fullName: string) {
  const dialog = await openOnboarding(page);
  await completePersonalStep(dialog, fullName);

  for (let i = 0; i < 7; i += 1) {
    await dialog.getByTestId("onboarding-next-button").click();
  }
  await dialog.getByTestId("onboarding-finish-button").click();

  await expect(page.getByTestId("toast-customer-onboarding-complete")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(dialog).toBeHidden({ timeout: TIMEOUT_MS });
}

async function createCustomerWithOptionalData(page: Page, fullName: string) {
  const dialog = await openOnboarding(page);
  await completePersonalStep(dialog, fullName);

  // Subscription.
  await dialog.getByTestId("onboarding-plan-trigger").click();
  await page.getByRole("option").first().click();
  await dialog.getByTestId("onboarding-next-button").click();

  // Objective.
  await dialog.getByTestId("onboarding-objective-input").fill("Increase adherence and energy");
  await dialog.getByTestId("onboarding-next-button").click();

  // Anthropometry.
  await dialog.locator('input[type="number"]').first().fill("72");
  await dialog.locator('input[type="number"]').nth(1).fill("170");
  await dialog.getByTestId("onboarding-next-button").click();

  // Pathologies + allergies + intolerances.
  const pathologyInputs = dialog.locator("input");
  const pathologyCount = await pathologyInputs.count();
  for (let i = 0; i < pathologyCount; i += 1) {
    await pathologyInputs.nth(i).fill(`tag-${i + 1}`);
    await pathologyInputs.nth(i).press("Enter");
  }
  await dialog.getByTestId("onboarding-next-button").click();

  // Medications.
  const medicationInput = dialog.locator("input").first();
  await medicationInput.fill("Vitamin D");
  await medicationInput.press("Enter");
  await dialog.getByTestId("onboarding-next-button").click();

  // Food preferences.
  const foodInputs = dialog.locator("input");
  const foodCount = await foodInputs.count();
  for (let i = 0; i < foodCount; i += 1) {
    await foodInputs.nth(i).fill(`food-${i + 1}`);
    await foodInputs.nth(i).press("Enter");
  }
  await dialog.getByTestId("onboarding-next-button").click();

  // Menstrual cycle notes (if applicable).
  const cycleNotes = dialog.locator("textarea").first();
  if ((await cycleNotes.count()) > 0) {
    await cycleNotes.fill("Regular cycle");
  }
  await dialog.getByTestId("onboarding-next-button").click();

  // Observations (if editor is visible).
  const noteEditor = dialog.locator('[contenteditable="true"]').first();
  if ((await noteEditor.count()) > 0) {
    await noteEditor.fill("Patient is motivated and engaged.");
  }
  await dialog.getByTestId("onboarding-finish-button").click();

  await expect(page.getByTestId("toast-customer-onboarding-complete")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(dialog).toBeHidden({ timeout: TIMEOUT_MS });
}

async function openCustomerDetail(page: Page, fullName: string) {
  await page.goto("/app/customers");
  const rowName = page.getByRole("table").getByText(fullName, { exact: true }).first();
  await expect(rowName).toBeVisible({ timeout: TIMEOUT_MS });
  await rowName.click();
}

function buildFutureDateInputValue(currentInputValue: string): string {
  const parts = currentInputValue.split("/");
  if (parts.length !== 3) {
    return "11/28/2030";
  }

  const first = Number(parts[0]);
  const second = Number(parts[1]);
  if (Number.isNaN(first) || Number.isNaN(second)) {
    return "11/28/2030";
  }

  if (first > 12) {
    return "28/11/2030";
  }

  return "11/28/2030";
}

type AddRecordTileName = "goal" | "subscription";

async function openAddRecordTile(page: Page, tileName: AddRecordTileName) {
  const addRecordButton = page.getByTestId("add-record-button").first();
  await expect(addRecordButton).toBeVisible({ timeout: TIMEOUT_MS });
  await addRecordButton.click();

  const tile = page.getByTestId(`add-record-tile-${tileName}`);
  await expect(tile).toBeVisible({ timeout: TIMEOUT_MS });
  await tile.click();
}

async function editCustomerFromDetail(page: Page, updatedGivenName: string) {
  await expect(page.getByTestId("customer-person-edit-button")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await page.getByTestId("customer-person-edit-button").click();

  const personDialog = page.getByRole("dialog").last();
  await personDialog.getByTestId("onboarding-given-name-input").fill(updatedGivenName);
  await personDialog.getByTestId("onboarding-next-button").click();

  await openAddRecordTile(page, "subscription");

  const subscriptionDialog = page.getByTestId("customer-subscription-dialog");
  await expect(subscriptionDialog).toBeVisible({ timeout: TIMEOUT_MS });

  await subscriptionDialog.getByTestId("customer-subscription-plan-trigger").click();
  await page.locator('[data-testid^="customer-subscription-plan-option-"]:visible').first().click();

  const saveButton = subscriptionDialog.getByTestId("customer-subscription-save-button");
  await expect(saveButton).toBeEnabled({ timeout: TIMEOUT_MS });
  await saveButton.click();
  await expect(subscriptionDialog).toBeHidden({ timeout: TIMEOUT_MS });

  // Reopen subscription dialog to edit start date.
  await openAddRecordTile(page, "subscription");
  await expect(subscriptionDialog).toBeVisible({ timeout: TIMEOUT_MS });

  const startDateInput = subscriptionDialog.getByTestId("customer-subscription-start-date-input");
  const currentDateValue = await startDateInput.inputValue();
  const updatedDateValue = buildFutureDateInputValue(currentDateValue);

  await startDateInput.fill(updatedDateValue);
  await startDateInput.blur();

  await expect(saveButton).toBeEnabled({ timeout: TIMEOUT_MS });
  await saveButton.click();
  await expect(subscriptionDialog).toBeHidden({ timeout: TIMEOUT_MS });

  // Reopen and verify the edited start date is now the current subscription date.
  await openAddRecordTile(page, "subscription");
  await expect(subscriptionDialog).toBeVisible({ timeout: TIMEOUT_MS });
  await expect(startDateInput).toHaveValue(updatedDateValue, {
    timeout: TIMEOUT_MS,
  });
  await page.keyboard.press("Escape");
  await expect(subscriptionDialog).toBeHidden({ timeout: TIMEOUT_MS });

  // Add a goal to verify the full workflow.
  await openAddRecordTile(page, "goal");

  const goalDialog = page.getByRole("dialog").last();
  await expect(goalDialog).toBeVisible({ timeout: TIMEOUT_MS });
  await page.keyboard.press("Escape");
  await expect(goalDialog).toBeHidden({ timeout: TIMEOUT_MS });
}

test.describe.configure({ mode: "serial" });

test("customer can skip optional onboarding and edit profile details later", async ({ page }) => {
  test.setTimeout(120_000);

  const runId = Date.now().toString();
  const email = `e2e-optional-skip-${runId}@local.test`;
  const fullName = "Nora Skip";

  await bootstrapSession(page, email);
  await createOrgWithPlan(page, runId);

  await createCustomerSkippingOptional(page, fullName);
  await openCustomerDetail(page, fullName);
  await editCustomerFromDetail(page, "NoraUpdated");
});

test("customer onboarding supports filling optional steps", async ({ page }) => {
  test.setTimeout(120_000);

  const runId = (Date.now() + 1).toString();
  const email = `e2e-optional-full-${runId}@local.test`;
  const fullName = "Olivia Optional";

  await bootstrapSession(page, email);
  await createOrgWithPlan(page, runId);

  await createCustomerWithOptionalData(page, fullName);

  await page.goto("/app/customers");
  await expect(page.getByRole("table").getByText(fullName, { exact: true }).first()).toBeVisible({
    timeout: TIMEOUT_MS,
  });
});
