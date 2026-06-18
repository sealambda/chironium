import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReassignCustomersDialog } from "@/features/customers/ui/reassign-customers-dialog";
import { renderWithQueryClient } from "@/test/render-with-query-client";

const { bulkReassignPractitionersToCustomers, fetchPractitionersList } = vi.hoisted(() => ({
  bulkReassignPractitionersToCustomers: vi.fn(),
  fetchPractitionersList: vi.fn(),
}));

vi.mock("@/features/customers/api/care-team-api", () => ({
  bulkReassignPractitionersToCustomers,
}));

vi.mock("@/features/practitioners/api/practitioners-api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/practitioners/api/practitioners-api")>();
  return {
    ...actual,
    fetchPractitionersList,
  };
});

describe("ReassignCustomersDialog", () => {
  const onOpenChange = vi.fn();
  const onCompleted = vi.fn();
  const organizationId = "org_test";

  const getDialog = () => {
    const dialog = screen.getAllByTestId("reassign-dialog").at(-1);
    expect(dialog).toBeDefined();
    return dialog as HTMLElement;
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("assigns selected customers to one practitioner", async () => {
    const user = userEvent.setup();
    fetchPractitionersList.mockResolvedValue([
      {
        id: "prac_a",
        name: [{ given: ["Taylor"], family: "One", text: "Taylor One" }],
        active: true,
      },
    ]);
    bulkReassignPractitionersToCustomers.mockResolvedValue({
      personsSkippedWithoutPatient: [],
    });

    renderWithQueryClient(
      <ReassignCustomersDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        selectedPersonIds={["person_x"]}
        onCompleted={onCompleted}
      />,
    );

    const dialog = getDialog();
    await within(dialog).findByTestId("reassign-practitioner-label-prac_a");
    await user.click(within(dialog).getByTestId("reassign-practitioner-checkbox-prac_a"));
    await user.click(within(dialog).getByTestId("reassign-apply-button"));

    await waitFor(() => {
      expect(bulkReassignPractitionersToCustomers).toHaveBeenCalledWith({
        organizationId,
        personIds: ["person_x"],
        practitionerIds: ["prac_a"],
        replaceExistingAssignments: false,
      });
    });
    expect(onCompleted).toHaveBeenCalled();
  });

  it("assigns the same customers to a second practitioner without replacing, so both are requested", async () => {
    const user = userEvent.setup();
    fetchPractitionersList.mockResolvedValue([
      {
        id: "prac_a",
        name: [{ given: ["Taylor"], family: "A", text: "Taylor A" }],
        active: true,
      },
      {
        id: "prac_b",
        name: [{ given: ["Jordan"], family: "B", text: "Jordan B" }],
        active: true,
      },
    ]);
    bulkReassignPractitionersToCustomers.mockResolvedValue({
      personsSkippedWithoutPatient: [],
    });

    renderWithQueryClient(
      <ReassignCustomersDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        selectedPersonIds={["person_x"]}
        onCompleted={onCompleted}
      />,
    );

    const dialog = getDialog();
    await within(dialog).findByTestId("reassign-practitioner-label-prac_b");
    await user.click(within(dialog).getByTestId("reassign-practitioner-checkbox-prac_a"));
    await user.click(within(dialog).getByTestId("reassign-practitioner-checkbox-prac_b"));
    await user.click(within(dialog).getByTestId("reassign-apply-button"));

    await waitFor(() => {
      expect(bulkReassignPractitionersToCustomers).toHaveBeenCalledWith({
        organizationId,
        personIds: ["person_x"],
        practitionerIds: expect.arrayContaining(["prac_a", "prac_b"]),
        replaceExistingAssignments: false,
      });
    });
    const call = bulkReassignPractitionersToCustomers.mock.calls[0]?.[0];
    expect(call?.practitionerIds).toHaveLength(2);
  });

  it("reassigns exclusively to another practitioner when replace existing is checked", async () => {
    const user = userEvent.setup();
    fetchPractitionersList.mockResolvedValue([
      {
        id: "prac_a",
        name: [{ given: ["Taylor"], family: "A", text: "Taylor A" }],
        active: true,
      },
      {
        id: "prac_b",
        name: [{ given: ["Jordan"], family: "B", text: "Jordan B" }],
        active: true,
      },
    ]);
    bulkReassignPractitionersToCustomers.mockResolvedValue({
      personsSkippedWithoutPatient: [],
    });

    renderWithQueryClient(
      <ReassignCustomersDialog
        open
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        selectedPersonIds={["person_x", "person_y"]}
        onCompleted={onCompleted}
      />,
    );

    const dialog = getDialog();
    await within(dialog).findByTestId("reassign-practitioner-label-prac_b");
    await user.click(within(dialog).getByTestId("reassign-practitioner-checkbox-prac_b"));
    await user.click(within(dialog).getByTestId("reassign-replace-checkbox"));
    await user.click(within(dialog).getByTestId("reassign-apply-button"));

    await waitFor(() => {
      expect(bulkReassignPractitionersToCustomers).toHaveBeenCalledWith({
        organizationId,
        personIds: ["person_x", "person_y"],
        practitionerIds: ["prac_b"],
        replaceExistingAssignments: true,
      });
    });
  });
});
