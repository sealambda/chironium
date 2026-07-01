import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const QuestionnaireBuilderPage = lazy(() =>
  import("@/features/questionnaires/pages/questionnaire-builder-page").then((m) => ({
    default: m.QuestionnaireBuilderPage,
  })),
);

/** Builder for a single questionnaire. The id `new` creates a fresh definition. */
export const Route = createFileRoute("/_app/questionnaires_/$questionnaireId")({
  component: QuestionnaireBuilderPage,
});
