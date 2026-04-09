import { expect, test } from "@playwright/test";

test.describe("public sign-in page", () => {
  test("offers Google OAuth entry", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByTestId("sign-in-heading")).toBeVisible();
    await expect(page.getByTestId("sign-in-google-link")).toBeVisible();
  });
});
