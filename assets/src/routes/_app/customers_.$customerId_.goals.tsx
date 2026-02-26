import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const GoalsPage = lazy(() =>
  import("@/features/customers/pages/goals-page").then((m) => ({
    default: m.GoalsPage,
  })),
);

export const Route = createFileRoute("/_app/customers_/$customerId_/goals")({
  component: GoalsPage,
});
