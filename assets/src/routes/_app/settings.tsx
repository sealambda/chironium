import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const SettingsPage = lazy(() =>
  import("@/features/org/pages/settings-page").then((m) => ({
    default: m.SettingsPage,
  })),
);

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});
