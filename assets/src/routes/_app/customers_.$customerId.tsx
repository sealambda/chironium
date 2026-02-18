import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

// Lazy load the person detail page for code splitting.
const PersonDetailPage = lazy(() =>
  import("@/features/customers/pages/person-detail-page").then((m) => ({
    default: m.PersonDetailPage,
  })),
);

/**
 * Person detail route showing individual person metrics and history.
 * Uses lazy loading for optimal bundle splitting.
 */
export const Route = createFileRoute("/_app/customers_/$customerId")({
  component: PersonDetailPage,
});
