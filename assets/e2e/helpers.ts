import { expect, type Page } from "@playwright/test";

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
