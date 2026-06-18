import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays } from "date-fns";
import { describe, expect, it, vi } from "vitest";

import { SendQuestionnaireDialog } from "@/features/questionnaires/ui/request/send-questionnaire-dialog";
import { toDateInput } from "@/shared/utils/date-time-input";
import { renderWithQueryClient } from "@/test/render-with-query-client";

const { requestQuestionnaire } = vi.hoisted(() => ({ requestQuestionnaire: vi.fn() }));

vi.mock("@/features/questionnaires/api/questionnaire-requests-api", () => ({
  requestQuestionnaire,
}));

vi.mock("@/features/questionnaires/api/questionnaires-api", () => ({
  fetchQuestionnaires: vi
    .fn()
    .mockResolvedValue([{ id: "q-1", title: "Intake", status: "ACTIVE" }]),
}));

vi.mock("@/features/customers/utils/person-detail-cache", () => ({
  invalidatePatientTasks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/session/use-org", () => ({
  // UTC+14 all year, so the result differs from the test machine's zone.
  useOrg: () => ({ selectedOrg: { id: "org-1", timezone: "Pacific/Kiritimati" } }),
}));

// The calendar popover is not what this test is about; a plain input sets the same value.
vi.mock("@/shared/ui/date-picker", () => ({
  // biome-ignore lint/style/useNamingConvention: mocks the exported component name.
  DatePickerString: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="due-date-input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe("SendQuestionnaireDialog", () => {
  it("sends the due date as the end of the picked day in the organization's timezone", async () => {
    const user = userEvent.setup();
    requestQuestionnaire.mockResolvedValue({
      taskId: "task-1",
      url: "https://example.test/portal/sign-in?token=t",
      emailSent: false,
      expiresAt: null,
      questionnaireTitle: "Intake",
    });
    const picked = toDateInput(addDays(new Date(), 3));

    renderWithQueryClient(
      <SendQuestionnaireDialog
        personId="person-1"
        patientId="patient-1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    const dialog = screen.getByTestId("send-questionnaire-dialog");
    await user.click(within(dialog).getByTestId("send-questionnaire-select"));
    await user.click(await screen.findByRole("option", { name: "Intake" }));
    await user.type(within(dialog).getByTestId("due-date-input"), picked);
    await user.click(within(dialog).getByTestId("send-questionnaire-submit"));

    await waitFor(() => expect(requestQuestionnaire).toHaveBeenCalledTimes(1));
    const [{ dueAt }] = requestQuestionnaire.mock.lastCall ?? [{}];
    expect(dueAt).toBe(`${picked}T23:59:59+14:00`);
  });
});
