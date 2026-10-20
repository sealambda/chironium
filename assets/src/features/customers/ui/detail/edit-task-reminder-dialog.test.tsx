import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditTaskReminderDialog } from "@/features/customers/ui/detail/edit-task-reminder-dialog";
import type { PatientTask } from "@/features/tasks/api/tasks-api";
import { tasksListQueryKey } from "@/shared/utils/query-keys";
import { createTestQueryClient, renderWithQueryClient } from "@/test/render-with-query-client";

const { updateTaskReminder, deleteTaskReminder, toast } = vi.hoisted(() => ({
  updateTaskReminder: vi.fn(),
  deleteTaskReminder: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("@/features/org/hooks/use-org", () => ({
  useOrg: () => ({ selectedOrg: { id: "org-1" } }),
}));

vi.mock("@/features/tasks/api/tasks-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/tasks/api/tasks-api")>()),
  updateTaskReminder,
  deleteTaskReminder,
}));

const reminder = {
  id: "task-r",
  status: "READY",
  description: "Call about results",
  requestedPeriod: { start: "2026-10-19T22:00:00.000Z", end: "2026-10-20T21:59:59.000Z" },
} as unknown as PatientTask;

// The Pending page and the menu counter read this query.
const pendingKey = [...tasksListQueryKey("org-1"), "pending"];

function renderDialog() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(pendingKey, [{ id: "task-r" }]);
  renderWithQueryClient(
    <EditTaskReminderDialog personId="person-1" task={reminder} open onOpenChange={() => {}} />,
    queryClient,
  );
  return queryClient;
}

describe("Edit reminder dialog", () => {
  afterEach(cleanup);

  beforeEach(() => {
    updateTaskReminder.mockReset().mockResolvedValue(undefined);
    deleteTaskReminder.mockReset().mockResolvedValue(undefined);
    toast.success.mockReset();
  });

  it("refreshes the Pending list after saving", async () => {
    const user = userEvent.setup();
    const queryClient = renderDialog();

    await user.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(updateTaskReminder).toHaveBeenCalled();
    expect(queryClient.getQueryState(pendingKey)?.isInvalidated).toBe(true);
  });

  it("refreshes the Pending list after deleting", async () => {
    const user = userEvent.setup();
    const queryClient = renderDialog();

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(deleteTaskReminder).toHaveBeenCalledWith("task-r", "org-1");
    expect(queryClient.getQueryState(pendingKey)?.isInvalidated).toBe(true);
  });
});
