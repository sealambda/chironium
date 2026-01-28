import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

// Lazy load the dashboard page for code splitting.
const DashboardPage = lazy(() =>
  import("@/features/dashboard/pages/dashboard-page").then((m) => ({
    default: m.DashboardPage,
  })),
);

/**
 * Dashboard route (currently disabled in navigation).
 * Protected by _authenticated layout - requires authentication.
 * Uses lazy loading for optimal bundle splitting.
 */
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});
