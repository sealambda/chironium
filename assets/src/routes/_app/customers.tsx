import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

// Lazy load the customers page for code splitting.
const CustomersPage = lazy(() =>
  import("@/features/customers/pages/customers-page").then((m) => ({
    default: m.CustomersPage,
  })),
);

/**
 * Customers route showing the list of customer cards.
 * Uses lazy loading for optimal bundle splitting.
 */
export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});
