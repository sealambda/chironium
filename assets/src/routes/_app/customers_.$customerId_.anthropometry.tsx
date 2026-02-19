import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const AnthropometryHistoryPage = lazy(() =>
  import("@/features/customers/pages/anthropometry-history-page").then((m) => ({
    default: m.AnthropometryHistoryPage,
  })),
);

export const Route = createFileRoute("/_app/customers_/$customerId_/anthropometry")({
  component: AnthropometryHistoryPage,
});
