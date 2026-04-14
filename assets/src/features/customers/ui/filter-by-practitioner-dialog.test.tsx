import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterByPractitionerDialog } from "@/features/customers/ui/filter-by-practitioner-dialog";
import { renderWithQueryClient } from "@/test/render-with-query-client";

const { fetchPractitionersList } = vi.hoisted(() => ({
  fetchPractitionersList: vi.fn(),
}));

vi.mock("@/features/practitioners/api/practitioners-api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/practitioners/api/practitioners-api")>();
  return {
    ...actual,
    fetchPractitionersList,
  };
});

describe("FilterByPractitionerDialog", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("applies the unassigned customers filter", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onOpenChange = vi.fn();

    fetchPractitionersList.mockResolvedValue([
      {
        id: "prac_a",
        name: [{ given: ["Taylor"], family: "One", text: "Taylor One" }],
        active: true,
      },
    ]);

    renderWithQueryClient(
      <FilterByPractitionerDialog
        open
        onOpenChange={onOpenChange}
        organizationId="org_test"
        selectedFilter={null}
        showUnassignedOption
        onApply={onApply}
      />,
    );

    const dialog = await screen.findByTestId("filter-practitioner-dialog");
    await within(dialog).findByTestId("filter-practitioner-label-prac_a");
    await user.click(within(dialog).getByTestId("filter-practitioner-checkbox-unassigned"));
    await user.click(within(dialog).getByTestId("filter-practitioner-apply-button"));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith({ kind: "unassigned" });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
