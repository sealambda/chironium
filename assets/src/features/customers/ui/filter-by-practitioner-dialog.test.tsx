import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type CustomerListFilters,
  DEFAULT_CUSTOMER_LIST_FILTERS,
} from "@/features/customers/model/person-filter-preferences";
import { CustomerFiltersDialog } from "@/features/customers/ui/filter-by-practitioner-dialog";
import * as m from "@/paraglide/messages";
import { createTestQueryClient, renderWithQueryClient } from "@/test/render-with-query-client";

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

function renderFiltersDialog({
  open = true,
  selectedFilters = DEFAULT_CUSTOMER_LIST_FILTERS,
  onApply = vi.fn<(filters: CustomerListFilters) => void>(),
  onOpenChange = vi.fn<(isOpen: boolean) => void>(),
}: {
  open?: boolean;
  selectedFilters?: CustomerListFilters;
  onApply?: (filters: CustomerListFilters) => void;
  onOpenChange?: (isOpen: boolean) => void;
} = {}) {
  fetchPractitionersList.mockResolvedValue([]);

  return renderWithQueryClient(
    <CustomerFiltersDialog
      open={open}
      onOpenChange={onOpenChange}
      organizationId="org_test"
      selectedFilters={selectedFilters}
      showUnassignedOption={false}
      onApply={onApply}
    />,
  );
}

describe("CustomerFiltersDialog", () => {
  afterEach(() => {
    cleanup();
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
      <CustomerFiltersDialog
        open
        onOpenChange={onOpenChange}
        organizationId="org_test"
        selectedFilters={DEFAULT_CUSTOMER_LIST_FILTERS}
        showUnassignedOption
        onApply={onApply}
      />,
    );

    const dialog = await screen.findByTestId("customer-filters-dialog");
    await within(dialog).findByTestId("filter-practitioner-label-prac_a");
    await user.click(within(dialog).getByTestId("filter-practitioner-checkbox-unassigned"));
    await user.click(within(dialog).getByTestId("customer-filters-apply-button"));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith({
        assignment: { kind: "unassigned" },
        hideFinishedPlans: false,
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("applies the hide finished plans filter", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onOpenChange = vi.fn();

    renderFiltersDialog({ onApply, onOpenChange });

    const dialog = await screen.findByTestId("customer-filters-dialog");
    await user.click(within(dialog).getByTestId("filter-hide-finished-plans-checkbox"));
    await user.click(within(dialog).getByTestId("customer-filters-apply-button"));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith({
        assignment: null,
        hideFinishedPlans: true,
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("unchecks hide finished plans after clearing all filters and reopening", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    const activeFilters = { ...DEFAULT_CUSTOMER_LIST_FILTERS, hideFinishedPlans: true };

    const queryClient = createTestQueryClient();
    const { rerender } = renderWithQueryClient(
      <CustomerFiltersDialog
        open
        onOpenChange={onOpenChange}
        organizationId="org_test"
        selectedFilters={activeFilters}
        showUnassignedOption={false}
        onApply={onApply}
      />,
      queryClient,
    );

    const dialog = await screen.findByTestId("customer-filters-dialog");
    await user.click(within(dialog).getByRole("button", { name: m.customers_filters_clear() }));

    expect(onApply).toHaveBeenCalledWith({
      assignment: null,
      hideFinishedPlans: false,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <CustomerFiltersDialog
          open
          onOpenChange={onOpenChange}
          organizationId="org_test"
          selectedFilters={DEFAULT_CUSTOMER_LIST_FILTERS}
          showUnassignedOption={false}
          onApply={onApply}
        />
      </QueryClientProvider>,
    );

    const reopenedDialog = await screen.findByTestId("customer-filters-dialog");
    expect(
      within(reopenedDialog).getByTestId("filter-hide-finished-plans-checkbox"),
    ).not.toBeChecked();
  });
});
