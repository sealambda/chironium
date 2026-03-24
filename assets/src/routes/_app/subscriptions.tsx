import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const SubscriptionsPage = lazy(() =>
  import("@/features/org/pages/subscriptions-page").then((mod) => ({
    default: mod.SubscriptionsPage,
  })),
);

export const Route = createFileRoute("/_app/subscriptions")({
  component: SubscriptionsPage,
});
