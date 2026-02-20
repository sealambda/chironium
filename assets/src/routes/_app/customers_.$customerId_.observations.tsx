import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ObservationsListPage = lazy(() =>
  import("@/features/customers/pages/observations-list-page").then((m) => ({
    default: m.ObservationsListPage,
  })),
);

export const Route = createFileRoute("/_app/customers_/$customerId_/observations")({
  component: ObservationsListPage,
});
