import { expect, type Page, test } from "@playwright/test";

import {
  bootstrapSession,
  createCustomer,
  createOrg,
  openCustomerDetail,
  TIMEOUT_MS,
} from "./helpers";

const QUESTIONNAIRE_TITLE = "E2E check-in";

/** Builds the questionnaire the way a practitioner does: one question recorded as body weight. */
async function createActiveQuestionnaire(page: Page) {
  await page.goto("/app/questionnaires");
  await page.getByRole("button", { name: "New questionnaire" }).first().click();
  await page.getByText("Blank questionnaire").click();

  await page.getByPlaceholder("e.g. Weekly nutrition check-in").fill(QUESTIONNAIRE_TITLE);
  await page.getByRole("checkbox", { name: "Ready to use" }).click();
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByPlaceholder("Question text").fill("How much do you weigh?");

  await page.getByRole("combobox").filter({ hasText: "Free text" }).click();
  await page.getByRole("option", { name: "Measurement" }).click();
  await page.getByRole("combobox").filter({ hasText: "Body weight" }).click();
  await page.getByRole("option", { name: "Body weight" }).click();

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Questionnaire saved.")).toBeVisible({ timeout: TIMEOUT_MS });
}

async function sendQuestionnaire(page: Page): Promise<string> {
  const addRecordButton = page.getByTestId("add-record-button").first();
  await expect(addRecordButton).toBeVisible({ timeout: TIMEOUT_MS });
  await addRecordButton.click();
  await page.getByTestId("add-record-tile-questionnaire_request").click();

  const dialog = page.getByTestId("send-questionnaire-dialog");
  await expect(dialog).toBeVisible({ timeout: TIMEOUT_MS });
  await dialog.getByTestId("send-questionnaire-select").click();
  await page.getByRole("option", { name: QUESTIONNAIRE_TITLE }).click();
  await dialog.getByTestId("send-questionnaire-submit").click();

  const linkInput = page.getByTestId("questionnaire-link-input");
  await expect(linkInput).toBeVisible({ timeout: TIMEOUT_MS });
  const link = await linkInput.inputValue();
  expect(link).toContain("/portal/sign-in?token=");

  await page.keyboard.press("Escape");
  return link;
}

test("a patient answers a questionnaire sent as a link", async ({ page, browser }) => {
  test.setTimeout(180_000);

  const runId = Date.now().toString();
  const fullName = "Paula Portal";

  await bootstrapSession(page, `e2e-links-${runId}@local.test`);
  await createOrg(page, `E2E Links Org ${runId}`);
  await createCustomer(page, fullName);
  await createActiveQuestionnaire(page);
  await openCustomerDetail(page, fullName);
  const link = await sendQuestionnaire(page);

  // The patient opens the link on their own device: no staff session.
  const patientContext = await browser.newContext();
  const patient = await patientContext.newPage();

  await patient.goto(link);
  await expect(patient.getByRole("heading", { name: "Your questionnaire" })).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await patient.getByRole("button", { name: "Continue" }).click();

  await expect(patient).toHaveURL(/\/portal$/, { timeout: TIMEOUT_MS });
  await expect(patient.getByText(QUESTIONNAIRE_TITLE)).toBeVisible({ timeout: TIMEOUT_MS });
  await patient.locator('input[type="number"]').first().fill("68.5");
  await patient.getByTestId("portal-submit").click();

  await expect(patient).toHaveURL(/\/portal\/done$/, { timeout: TIMEOUT_MS });
  await expect(patient.getByRole("heading", { name: "Thank you" })).toBeVisible();

  // The link is single-use.
  await patientContext.clearCookies();
  await patient.goto(link);
  await expect(patient).toHaveURL(/\/portal\/link-expired$/, { timeout: TIMEOUT_MS });
  await patientContext.close();

  // Staff see the completed request and the self-reported values.
  await page.reload();
  await expect(page.getByText("Completed").first()).toBeVisible({ timeout: TIMEOUT_MS });
  await expect(page.getByText("Self-reported").first()).toBeVisible({ timeout: TIMEOUT_MS });

  // The coded weight answer lands in the anthropometry card, flagged as self-reported.
  const anthropometry = page.getByTestId("anthropometry-card");
  await expect(anthropometry.getByText("68.5", { exact: true })).toBeVisible({
    timeout: TIMEOUT_MS,
  });
  await expect(anthropometry.getByText("Self-reported")).toBeVisible();
});
