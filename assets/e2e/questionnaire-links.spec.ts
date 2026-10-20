import { expect, type Page, test } from "@playwright/test";

import {
  bootstrapSession,
  createCustomer,
  createOrg,
  openCustomerDetail,
  TIMEOUT_MS,
} from "./helpers";

const QUESTIONNAIRE_TITLE = "E2E check-in";

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
});
