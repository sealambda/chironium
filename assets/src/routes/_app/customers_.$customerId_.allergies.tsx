import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const AllergyIntoleranceHistoryPage = lazy(() =>
  import("@/features/customers/pages/allergy-intolerance-history-page").then((m) => ({
    default: m.AllergyIntoleranceHistoryPage,
  })),
);

export const Route = createFileRoute("/_app/customers_/$customerId_/allergies")({
  component: AllergyIntoleranceHistoryPage,
});
