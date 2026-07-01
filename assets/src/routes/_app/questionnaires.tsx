import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const QuestionnairesPage = lazy(() =>
  import("@/features/questionnaires/pages/questionnaires-page").then((m) => ({
    default: m.QuestionnairesPage,
  })),
);

/** Questionnaire library: list of definitions practitioners can author and fill. */
export const Route = createFileRoute("/_app/questionnaires")({
  component: QuestionnairesPage,
});
