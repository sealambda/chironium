import { expect, type Page, test } from "@playwright/test";

import { TIMEOUT_MS } from "./helpers";
import {
  devPlaywrightEnsureUser,
  devPlaywrightSession,
  getPlaywrightE2EEnv,
} from "./playwright-session";

const QUESTIONNAIRE_TITLE = "E2E check-in";

async function bootstrapSession(page: Page, email: string) {
  const { baseURL, secret } = getPlaywrightE2EEnv();

  await devPlaywrightEnsureUser(page.request, { baseURL, secret, email });
  await devPlaywrightSession(page.request, { baseURL, secret, email });
}

async function createOrg(page: Page, runId: string) {
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
  await dialog.getByTestId("create-org-name-input").fill(`E2E Links Org ${runId}`);
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

async function createCustomer(page: Page, fullName: string) {
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

/** The builder saves drafts; activating through its UI adds nothing this flow tests. */
async function createActiveQuestionnaire(page: Page) {
  const payload = await page.evaluate(async (title) => {
    const organizationId = localStorage.getItem("chironium_preferred_org_id");
    const csrf = document.querySelector("meta[name='csrf-token']")?.getAttribute("content") ?? "";
    const response = await fetch("/gql", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
        "x-chironium-organizationid": `org_${organizationId}`,
      },
      body: JSON.stringify({
        query:
          "mutation ($input: CreateQuestionnaireInput!) { createQuestionnaire(input: $input) { result { id } errors { message } } }",
        variables: {
          input: {
            title,
            status: "ACTIVE",
            item: [
              {
                linkId: "weight",
                type: "quantity",
                text: "Body weight",
                required: true,
                code: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }],
                unit: { system: "http://unitsofmeasure.org", code: "kg", display: "kg" },
              },
            ],
          },
        },
      }),
    });
    return response.json();
  }, QUESTIONNAIRE_TITLE);

  expect(payload.data.createQuestionnaire.errors).toEqual([]);
}

async function openCustomerDetail(page: Page, fullName: string) {
  await page.goto("/app/customers");
  const rowName = page.getByRole("table").getByText(fullName, { exact: true }).first();
  await expect(rowName).toBeVisible({ timeout: TIMEOUT_MS });
  await rowName.click();
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
  await createOrg(page, runId);
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
});
