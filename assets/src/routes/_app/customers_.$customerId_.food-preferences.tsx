import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const FoodPreferencesHistoryPage = lazy(() =>
  import("@/features/customers/pages/food-preferences-history-page").then((m) => ({
    default: m.FoodPreferencesHistoryPage,
  })),
);

export const Route = createFileRoute("/_app/customers_/$customerId_/food-preferences")({
  component: FoodPreferencesHistoryPage,
});
