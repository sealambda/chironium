import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { QuestionnaireLink } from "@/features/questionnaires/api/questionnaire-requests-api";
import { QuestionnaireLinkResult } from "@/features/questionnaires/ui/request/questionnaire-link-result";
import * as m from "@/paraglide/messages";

const LINK: QuestionnaireLink = {
  taskId: "task-1",
  url: "https://example.test/portal/link?token=secret",
  emailSent: false,
  expiresAt: "2026-10-02T12:00:00.000Z",
  questionnaireTitle: "Intake",
};

describe("QuestionnaireLinkResult", () => {
  it("shows the email note only when the link was emailed", () => {
    const { rerender } = render(<QuestionnaireLinkResult link={LINK} />);
    expect(screen.queryByText(m.questionnaire_link_email_sent())).not.toBeInTheDocument();

    rerender(<QuestionnaireLinkResult link={{ ...LINK, emailSent: true }} />);
    expect(screen.getByText(m.questionnaire_link_email_sent())).toBeInTheDocument();
  });
});
