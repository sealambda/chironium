import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const NutritionPlansPage = lazy(() =>
  import("@/features/customers/pages/nutrition-plans-page").then((m) => ({
    default: m.NutritionPlansPage,
  })),
);

export const Route = createFileRoute("/_app/customers_/$customerId_/nutrition")({
  component: NutritionPlansPage,
});
