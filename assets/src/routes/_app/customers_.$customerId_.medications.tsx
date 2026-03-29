import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const MedicationsHistoryPage = lazy(() =>
  import("@/features/customers/pages/medications-history-page").then((m) => ({
    default: m.MedicationsHistoryPage,
  })),
);

export const Route = createFileRoute("/_app/customers_/$customerId_/medications")({
  component: MedicationsHistoryPage,
});
