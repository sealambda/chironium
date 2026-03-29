import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ConditionsHistoryPage = lazy(() =>
  import("@/features/customers/pages/conditions-history-page").then((m) => ({
    default: m.ConditionsHistoryPage,
  })),
);

export const Route = createFileRoute("/_app/customers_/$customerId_/conditions")({
  component: ConditionsHistoryPage,
});
