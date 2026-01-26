import { createFileRoute } from "@tanstack/react-router";

import { CustomersPage } from "@/pages/customers";

/**
 * Customers route showing the list of customer cards.
 * Protected by _authenticated layout - requires authentication.
 */
export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
});
