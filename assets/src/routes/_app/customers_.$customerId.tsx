import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

// Lazy load the customer detail page for code splitting.
const CustomerDetailPage = lazy(() =>
  import("@/features/customers/pages/customer-detail-page").then((m) => ({
    default: m.CustomerDetailPage,
  })),
);

/**
 * Customer detail route showing individual customer metrics and history.
 * Uses lazy loading for optimal bundle splitting.
 */
export const Route = createFileRoute("/_app/customers_/$customerId")({
  component: CustomerDetailPage,
});
