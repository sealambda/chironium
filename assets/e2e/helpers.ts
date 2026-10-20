import { expect, type Page } from "@playwright/test";

import {
  devPlaywrightEnsureUser,
  devPlaywrightSession,
  getPlaywrightE2EEnv,
} from "./playwright-session";

export const TIMEOUT_MS = 10_000;

/**
 * Reassign list uses sortPractitionersByGivenNameAsc (given name A→Z).
 * This suite uses practitioners "Manager …" and "Member …", so indices are stable.
 */
export enum ReassignPractitionerSortIndex {
  First = 0,
  Second = 1,
}

/**
 * Pending invitations open a modal that blocks the rest of the UI; reject so flows can continue.
 */
export async function dismissOrganizationInvitationIfPresent(page: Page) {
  const rejectButton = page.getByTestId("invitation-reject-button");
  try {
    await rejectButton.waitFor({ state: "visible", timeout: TIMEOUT_MS });
  } catch {
    return;
  }
  await rejectButton.click();
  await expect(rejectButton).not.toBeVisible({ timeout: TIMEOUT_MS });
}

/** Clicks the visible practitioner row label in the reassign dialog (not the hidden Base UI checkbox input). */
export async function selectPractitionerInReassignDialog(
  page: Page,
  sortedListIndex: ReassignPractitionerSortIndex,
): Promise<void> {
  const dialog = page.getByTestId("reassign-dialog");
  await expect(dialog).toBeVisible({ timeout: TIMEOUT_MS });
  await dialog
    .locator('[data-testid^="reassign-practitioner-label-"]')
    .nth(sortedListIndex)
    .click();
}

/** Signs in as a dev user, creating it when needed. */
export async function bootstrapSession(page: Page, email: string) {
  const { baseURL, secret } = getPlaywrightE2EEnv();

  await devPlaywrightEnsureUser(page.request, { baseURL, secret, email });
  await devPlaywrightSession(page.request, { baseURL, secret, email });
}

/** Creates an organization with one subscription plan and selects it. */
export async function createOrg(page: Page, name: string) {
  await page.goto("/app/settings");

  const createButton = page.getByTestId("no-org-create-organization-button");
  await Promise.race([
    expect(createButton).toBeVisible({ timeout: TIMEOUT_MS }),
    expect(page.getByTestId("settings-heading")).toBeVisible({ timeout: TIMEOUT_MS }),
  ]);

  if (await createButton.isVisible()) {
    await createButton.click();
  } else {
    await page.getByTestId("org-selector-trigger").click();
    await page.getByTestId("org-selector-create-button").click();
  }

  const dialog = page.getByTestId("create-org-dialog");
  await dialog.getByTestId("create-org-name-input").fill(name);
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

/** Onboards a customer with only a name, skipping the optional steps. */
export async function createCustomer(page: Page, fullName: string) {
  const [givenName, familyName] = fullName.split(" ");

  await page.goto("/app/customers");
  await page.getByTestId("customers-new-button-header").click();
  const dialog = page.getByTestId("customer-onboarding-dialog");
  await dialog.getByTestId("onboarding-given-name-input").fill(givenName);
  await dialog.getByTestId("onboarding-family-name-input").fill(familyName);
  await dialog.getByTestId("onboarding-next-button").click();
  for (let i = 0; i < 7; i += 1) {
    await dialog.getByTestId("onboarding-next-button").click();
  }
  await dialog.getByTestId("onboarding-finish-button").click();

  await expect(page.getByTestId("toast-customer-onboarding-complete")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
}

export async function openCustomerDetail(page: Page, fullName: string) {
  await page.goto("/app/customers");
  const rowName = page.getByRole("table").getByText(fullName, { exact: true }).first();
  await expect(rowName).toBeVisible({ timeout: TIMEOUT_MS });
  await rowName.click();
}
