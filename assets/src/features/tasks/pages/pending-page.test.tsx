import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, addHours } from "date-fns";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PendingTask } from "@/features/tasks/api/tasks-api";
import { PendingPage } from "@/features/tasks/pages/pending-page";
import { renderWithQueryClient } from "@/test/render-with-query-client";

const { completeTaskReminder, reissueQuestionnaireLink, pending, toast } = vi.hoisted(() => ({
  completeTaskReminder: vi.fn(),
  reissueQuestionnaireLink: vi.fn(),
  pending: { data: [] as PendingTask[], isLoading: false },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("@tanstack/react-router", () => ({
  // biome-ignore lint/style/useNamingConvention: mocks the exported component name.
  Link: ({
    children,
    params,
    className,
  }: {
    children: ReactNode;
    params: { customerId: string };
    className?: string;
  }) => (
    <a href={`/customers/${params.customerId}`} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/tasks/hooks/use-pending-tasks", () => ({
  usePendingTasks: () => pending,
}));

vi.mock("@/features/tasks/api/tasks-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/tasks/api/tasks-api")>()),
  completeTaskReminder,
}));

vi.mock("@/features/questionnaires/api/questionnaire-requests-api", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/features/questionnaires/api/questionnaire-requests-api")
  >()),
  reissueQuestionnaireLink,
}));

vi.mock("@/features/customers/utils/person-detail-cache", () => ({
  invalidatePatientTasks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/org/hooks/use-org", () => ({
  useOrg: () => ({ selectedOrg: { id: "org-1" } }),
}));

const patient = {
  id: "patient-1",
  personId: "person-1",
  person: { name: [{ text: null, given: ["Ana"], family: "López", prefix: null }] },
};

const overdueQuestionnaire: PendingTask = {
  id: "task-q",
  status: "REQUESTED",
  description: null,
  dueAt: addDays(new Date(), -3).toISOString(),
  accessExpiresAt: addDays(new Date(), 4).toISOString(),
  focusQuestionnaireId: "q-1",
  focusQuestionnaire: { title: "Weekly check-in" },
  forPatient: patient,
};

const dueReminder: PendingTask = {
  id: "task-r",
  status: "READY",
  description: "Call about results",
  dueAt: addHours(new Date(), -5).toISOString(),
  accessExpiresAt: null,
  focusQuestionnaireId: null,
  focusQuestionnaire: null,
  forPatient: patient,
};

describe("PendingPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    completeTaskReminder.mockReset();
    pending.data = [overdueQuestionnaire, dueReminder];
  });

  it("renders questionnaire and reminder rows with their late text and actions", () => {
    renderWithQueryClient(<PendingPage />);

    const [questionnaireRow, reminderRow] = screen.getAllByTestId("pending-row");
    if (!(questionnaireRow && reminderRow)) {
      throw new Error("Expected two pending rows.");
    }

    expect(within(questionnaireRow).getByRole("link", { name: "Ana López" })).toHaveAttribute(
      "href",
      "/customers/person-1",
    );
    expect(within(questionnaireRow).getByText("Questionnaire: Weekly check-in")).toBeVisible();
    expect(within(questionnaireRow).getByText("Overdue")).toBeVisible();
    expect(within(questionnaireRow).getByText(/3 days late/)).toBeVisible();
    expect(within(questionnaireRow).getByRole("button", { name: "Send a new link" })).toBeVisible();
    expect(within(questionnaireRow).queryByRole("button", { name: "Mark as done" })).toBeNull();

    expect(within(reminderRow).getByText("Reminder: Call about results")).toBeVisible();
    expect(within(reminderRow).getByText(/5 hours late/)).toBeVisible();
    expect(within(reminderRow).getByRole("button", { name: "Mark as done" })).toBeVisible();
  });

  it("shows when a link expired for a request without a due date", () => {
    pending.data = [
      {
        ...overdueQuestionnaire,
        dueAt: null,
        accessExpiresAt: addDays(new Date(), -2).toISOString(),
      },
    ];

    renderWithQueryClient(<PendingPage />);

    expect(screen.getByText("Link expired")).toBeVisible();
    expect(screen.getByText("Link expired 2 days ago")).toBeVisible();
  });

  it("marks a reminder as done", async () => {
    const user = userEvent.setup();
    completeTaskReminder.mockResolvedValue(undefined);

    renderWithQueryClient(<PendingPage />);
    await user.click(screen.getByRole("button", { name: "Mark as done" }));

    await waitFor(() => expect(completeTaskReminder).toHaveBeenCalledWith("task-r", "org-1"));
    expect(toast.success).toHaveBeenCalledWith("Reminder marked as done.");
  });

  it("keeps a resent link on screen after its request leaves the list", async () => {
    const user = userEvent.setup();
    const newLink = "https://chironium.test/portal/sign-in?token=new-token";
    pending.data = [
      {
        ...overdueQuestionnaire,
        dueAt: null,
        accessExpiresAt: addDays(new Date(), -2).toISOString(),
      },
    ];
    reissueQuestionnaireLink.mockResolvedValue({
      taskId: "task-q",
      url: newLink,
      emailSent: false,
      expiresAt: addDays(new Date(), 7).toISOString(),
      questionnaireTitle: "Weekly check-in",
    });

    const { queryClient, rerender } = renderWithQueryClient(<PendingPage />);
    await user.click(screen.getByRole("button", { name: "Send a new link" }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Create new link" }));
    await screen.findByDisplayValue(newLink);

    // With a fresh link and no due date, the request is no longer pending.
    pending.data = [];
    rerender(
      <QueryClientProvider client={queryClient}>
        <PendingPage />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId("pending-row")).toBeNull();
    expect(screen.getByDisplayValue(newLink)).toBeVisible();
  });

  it("shows the empty state", () => {
    pending.data = [];

    renderWithQueryClient(<PendingPage />);

    expect(screen.getByText("Nothing pending")).toBeVisible();
    expect(screen.queryByTestId("pending-row")).toBeNull();
  });
});
