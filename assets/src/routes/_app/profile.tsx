import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ProfilePage = lazy(() =>
  import("@/features/user/pages/profile-page").then((m) => ({
    default: m.ProfilePage,
  })),
);

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});
