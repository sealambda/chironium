import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

// Lazy load the tasks page for code splitting.
const TasksPage = lazy(() =>
  import("@/features/tasks/pages/tasks-page").then((m) => ({
    default: m.TasksPage,
  })),
);

/**
 * Tasks route showing the list of tasks.
 * Uses lazy loading for optimal bundle splitting.
 */
export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});
