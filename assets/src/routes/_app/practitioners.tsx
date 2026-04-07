import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const PractitionersPage = lazy(() =>
  import("@/features/practitioners/pages/practitioners-page").then((mod) => ({
    default: mod.PractitionersPage,
  })),
);

export const Route = createFileRoute("/_app/practitioners")({
  component: PractitionersPage,
});
