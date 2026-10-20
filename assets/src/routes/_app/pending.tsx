import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const PendingPage = lazy(() =>
  import("@/features/tasks/pages/pending-page").then((m) => ({
    default: m.PendingPage,
  })),
);

/** Overdue questionnaires, expired links and due reminders that need the practitioner. */
export const Route = createFileRoute("/_app/pending")({
  component: PendingPage,
});
