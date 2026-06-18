import { type Browser, type BrowserContext, expect, type Page, test } from "@playwright/test";

import {
  dismissOrganizationInvitationIfPresent,
  ReassignPractitionerSortIndex,
  selectPractitionerInReassignDialog,
  TIMEOUT_MS,
} from "./helpers";
import {
  devPlaywrightEnsureUser,
  devPlaywrightInvitationCode,
  devPlaywrightSession,
  getPlaywrightE2EEnv,
} from "./playwright-session";

function tableCustomerName(page: Page, fullName: string) {
  return page.getByRole("table").getByText(fullName, { exact: true }).first();
}

async function createSessionContext(
  browser: Browser,
  page: Page,
  email: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const { baseURL, secret } = getPlaywrightE2EEnv();
  const request = page.request;
  await devPlaywrightEnsureUser(request, { baseURL, secret, email });

  const context = await browser.newContext();
  const nextPage = await context.newPage();
  await devPlaywrightSession(nextPage.request, { baseURL, secret, email });
  return { context, page: nextPage };
}

async function createOrgAsOwner(page: Page, runId: string) {
  const orgName = `E2E Org ${runId}`;

  await page.goto("/app/settings");
  const settingsHeading = page.getByTestId("settings-heading");
  const createFromOrgSelector = page.getByTestId("org-selector-create-button");

  // First run can land on the no-org access screen instead of settings.
  await Promise.race([
    expect(page.getByTestId("no-org-create-organization-button")).toBeVisible({
      timeout: TIMEOUT_MS,
    }),
    expect(settingsHeading).toBeVisible({ timeout: TIMEOUT_MS }),
  ]);

  if (await page.getByTestId("no-org-create-organization-button").isVisible()) {
    await page.getByTestId("no-org-create-organization-button").click();
  } else {
    await page.getByTestId("org-selector-trigger").click();
    await createFromOrgSelector.click();
  }
  const createOrgDialog = page.getByTestId("create-org-dialog");
  await expect(createOrgDialog).toBeVisible({ timeout: TIMEOUT_MS });

  await createOrgDialog.getByTestId("create-org-name-input").fill(orgName);
  await createOrgDialog.getByTestId("create-org-next-button").click();
  await createOrgDialog.getByTestId("create-org-plan-name-input").fill("Monthly");
  await createOrgDialog.getByTestId("create-org-plan-duration-value-input").fill("1");
  await createOrgDialog.getByTestId("create-org-plan-duration-unit-trigger").click();
  await page.getByRole("option").first().click();
  await createOrgDialog.getByTestId("create-org-add-plan-button").click();
  await createOrgDialog.getByTestId("create-org-finish-button").click();

  await expect(page.getByTestId("toast-organization-created")).toBeVisible({
    timeout: TIMEOUT_MS,
  });

  // Verify we are operating on the org created in this run, not stale state.
  await expect(page.getByRole("navigation").getByText(orgName)).toBeVisible({
    timeout: TIMEOUT_MS,
  });

  await page.goto("/app/settings");
  await expect(page.getByTestId("settings-heading")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(page.getByRole("main").getByText(orgName, { exact: true })).toBeVisible({
    timeout: TIMEOUT_MS,
  });
}

async function inviteUser(page: Page, email: string, role: "manager" | "member"): Promise<string> {
  const { baseURL, secret } = getPlaywrightE2EEnv();

  await page.goto("/app/settings");
  await expect(page.getByTestId("settings-heading")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await page.getByTestId("settings-invite-member-button").click();
  const dialog = page.getByTestId("invite-member-dialog");
  await expect(dialog).toBeVisible({ timeout: TIMEOUT_MS });
  await dialog.getByTestId("invite-member-email-input").fill(email);
  if (role === "manager") {
    await dialog.getByTestId("invite-member-role-trigger").click();
    await page.getByTestId("invite-member-role-option-power_user").click();
  }
  await dialog.getByTestId("invite-member-submit-button").click();
  await expect(page.getByRole("row").filter({ hasText: email })).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  return devPlaywrightInvitationCode(page.request, { baseURL, secret, email });
}

async function acceptInvitation(page: Page, inviteCode: string) {
  await page.goto(`/app?inviteCode=${encodeURIComponent(inviteCode)}`);

  const invitationCodeInput = page.getByTestId("invitation-code-input");
  const acceptButton = page.getByTestId("invitation-accept-button");
  await expect(invitationCodeInput).toBeVisible({ timeout: TIMEOUT_MS });
  await expect(invitationCodeInput).toHaveValue(inviteCode, {
    timeout: TIMEOUT_MS,
  });
  await expect(acceptButton).toBeVisible({ timeout: TIMEOUT_MS });

  await acceptButton.click();

  await expect(acceptButton).not.toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(page).not.toHaveURL(/inviteCode=/, { timeout: TIMEOUT_MS });
}

async function makePractitioner(page: Page, email: string, givenName: string, familyName: string) {
  const row = page.getByRole("row").filter({ hasText: email });
  await row.locator('[data-testid^="member-actions-"]').first().click();
  await page.locator('[data-testid^="member-make-practitioner-"]').first().click();
  const dialog = page.getByTestId("make-practitioner-dialog");
  await expect(dialog).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await dialog.getByTestId("make-practitioner-given-name-input").fill(givenName);
  await dialog.getByTestId("make-practitioner-family-name-input").fill(familyName);
  await dialog.getByTestId("make-practitioner-submit-button").click();
  await expect(dialog).toBeHidden({ timeout: TIMEOUT_MS });
}

async function createCustomer(page: Page, fullName: string) {
  await page.goto("/app/customers");
  await expect(page.getByTestId("customers-heading")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await page.getByTestId("customers-new-button-header").click();
  const onboardingDialog = page.getByTestId("customer-onboarding-dialog");
  await expect(onboardingDialog).toBeVisible({ timeout: TIMEOUT_MS });

  const [givenName, familyName] = fullName.split(" ");
  await onboardingDialog.getByTestId("onboarding-given-name-input").fill(givenName);
  await onboardingDialog.getByTestId("onboarding-family-name-input").fill(familyName);
  await onboardingDialog.getByTestId("onboarding-next-button").click();

  await onboardingDialog.getByTestId("onboarding-plan-trigger").click();
  await page.getByRole("option").first().click();
  await onboardingDialog.getByTestId("onboarding-next-button").click();

  await onboardingDialog.getByTestId("onboarding-objective-input").fill("Improve wellness");
  await onboardingDialog.getByTestId("onboarding-next-button").click();
  await onboardingDialog.getByTestId("onboarding-next-button").click();
  await onboardingDialog.getByTestId("onboarding-next-button").click();
  await onboardingDialog.getByTestId("onboarding-next-button").click();
  await onboardingDialog.getByTestId("onboarding-next-button").click();
  await onboardingDialog.getByTestId("onboarding-next-button").click();
  await onboardingDialog.getByTestId("onboarding-finish-button").click();
  await expect(page.getByTestId("toast-customer-onboarding-complete")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(onboardingDialog).toBeHidden({ timeout: TIMEOUT_MS });
  await expect(tableCustomerName(page, `${givenName} ${familyName}`)).toBeVisible({
    timeout: TIMEOUT_MS,
  });
}

test.describe.configure({ mode: "serial" });

test("full invite and customer assignment lifecycle", async ({ browser, page }) => {
  test.setTimeout(120_000);

  const runId = Date.now().toString();
  const managerEmail = `e2e-manager-${runId}@local.test`;
  const memberEmail = `e2e-member-${runId}@local.test`;
  const firstCustomer = "Alice Alpha";
  const secondCustomer = "Brenda Beta";
  const memberOwnedCustomer = "Miriam Member";

  await createOrgAsOwner(page, runId);
  const managerInviteCode = await inviteUser(page, managerEmail, "manager");

  const managerCtx = await createSessionContext(browser, page, managerEmail);
  await acceptInvitation(managerCtx.page, managerInviteCode);
  const memberInviteCode = await inviteUser(managerCtx.page, memberEmail, "member");

  const memberCtx = await createSessionContext(browser, page, memberEmail);
  await acceptInvitation(memberCtx.page, memberInviteCode);

  await page.goto("/app/settings");
  await dismissOrganizationInvitationIfPresent(page);
  await makePractitioner(page, managerEmail, "Manager", "Practitioner");
  await makePractitioner(page, memberEmail, "Member", "Practitioner");

  await createCustomer(page, firstCustomer);
  await createCustomer(page, secondCustomer);

  await page.goto("/app/customers");
  await page.getByTestId("customers-select-all-checkbox").click();
  await page.getByTestId("customers-reassign-button").click();
  await selectPractitionerInReassignDialog(page, ReassignPractitionerSortIndex.First);
  await page.getByTestId("reassign-replace-checkbox").click();
  await page.getByTestId("reassign-apply-button").click();

  await managerCtx.page.goto("/app/customers");
  await expect(tableCustomerName(managerCtx.page, firstCustomer)).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(tableCustomerName(managerCtx.page, secondCustomer)).toBeVisible({
    timeout: TIMEOUT_MS,
  });

  await managerCtx.page
    .getByRole("row")
    .filter({ hasText: firstCustomer })
    .locator('[data-testid^="customers-row-checkbox-"]')
    .first()
    .click();
  await managerCtx.page.getByTestId("customers-reassign-button").click();
  await selectPractitionerInReassignDialog(managerCtx.page, ReassignPractitionerSortIndex.Second);
  await managerCtx.page.getByTestId("reassign-apply-button").click();
  await expect(tableCustomerName(managerCtx.page, firstCustomer)).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(tableCustomerName(managerCtx.page, secondCustomer)).toBeVisible({
    timeout: TIMEOUT_MS,
  });

  await memberCtx.page.goto("/app/customers");
  await expect(tableCustomerName(memberCtx.page, firstCustomer)).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(tableCustomerName(memberCtx.page, secondCustomer)).not.toBeVisible({
    timeout: TIMEOUT_MS,
  });

  await managerCtx.page.goto("/app/customers");
  await managerCtx.page.getByTestId("customers-select-all-checkbox").click();
  await managerCtx.page.getByTestId("customers-reassign-button").click();
  await selectPractitionerInReassignDialog(managerCtx.page, ReassignPractitionerSortIndex.First);
  await managerCtx.page.getByTestId("reassign-replace-checkbox").click();
  await managerCtx.page.getByTestId("reassign-apply-button").click();

  await memberCtx.page.goto("/app/customers");
  await expect(memberCtx.page.getByTestId("customers-heading")).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(tableCustomerName(memberCtx.page, firstCustomer)).not.toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(tableCustomerName(memberCtx.page, secondCustomer)).not.toBeVisible({
    timeout: TIMEOUT_MS,
  });

  await createCustomer(memberCtx.page, memberOwnedCustomer);
  await expect(tableCustomerName(memberCtx.page, memberOwnedCustomer)).toBeVisible({
    timeout: TIMEOUT_MS,
  });

  await managerCtx.context.close();
  await memberCtx.context.close();
});
