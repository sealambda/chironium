import { describe, expect, it } from "vitest";

import {
  isOpenQuestionnaireRequest,
  questionnaireRequestStatus,
} from "@/features/questionnaires/model/questionnaire-request-status";

const NOW = new Date("2026-09-25T12:00:00.000Z");
const FUTURE = "2026-10-02T12:00:00.000Z";
const PAST = "2026-09-24T12:00:00.000Z";

describe("questionnaireRequestStatus", () => {
  it("reports a requested task with a live link as sent", () => {
    expect(questionnaireRequestStatus({ status: "REQUESTED", accessExpiresAt: FUTURE }, NOW)).toBe(
      "sent",
    );
  });

  it("reports an in-progress task as opened", () => {
    expect(
      questionnaireRequestStatus({ status: "IN_PROGRESS", accessExpiresAt: FUTURE }, NOW),
    ).toBe("opened");
  });

  it("reports an open task whose access has passed as expired", () => {
    expect(questionnaireRequestStatus({ status: "REQUESTED", accessExpiresAt: PAST }, NOW)).toBe(
      "expired",
    );
    expect(questionnaireRequestStatus({ status: "IN_PROGRESS", accessExpiresAt: PAST }, NOW)).toBe(
      "expired",
    );
  });

  it("treats the exact expiry instant as expired", () => {
    expect(
      questionnaireRequestStatus({ status: "REQUESTED", accessExpiresAt: NOW.toISOString() }, NOW),
    ).toBe("expired");
  });

  it("never expires an open task without an expiry", () => {
    expect(questionnaireRequestStatus({ status: "REQUESTED", accessExpiresAt: null }, NOW)).toBe(
      "sent",
    );
    expect(questionnaireRequestStatus({ status: "ACCEPTED" }, NOW)).toBe("sent");
  });

  it("reports completed and cancelled tasks regardless of expiry", () => {
    expect(questionnaireRequestStatus({ status: "COMPLETED", accessExpiresAt: PAST }, NOW)).toBe(
      "completed",
    );
    expect(questionnaireRequestStatus({ status: "CANCELLED", accessExpiresAt: FUTURE }, NOW)).toBe(
      "cancelled",
    );
  });

  it("counts other closed statuses as cancelled", () => {
    for (const status of ["FAILED", "REJECTED", "ENTERED_IN_ERROR"] as const) {
      expect(questionnaireRequestStatus({ status, accessExpiresAt: FUTURE }, NOW)).toBe(
        "cancelled",
      );
    }
  });
});

describe("questionnaireRequestStatus with a due date", () => {
  const DUE_YESTERDAY = "2026-09-24T21:59:59.000Z";
  const DUE_TOMORROW = "2026-09-26T21:59:59.000Z";

  it("reports overdue the day after the due date while the link still works", () => {
    expect(
      questionnaireRequestStatus(
        { status: "REQUESTED", accessExpiresAt: FUTURE, dueAt: DUE_YESTERDAY },
        NOW,
      ),
    ).toBe("overdue");
    expect(
      questionnaireRequestStatus(
        { status: "IN_PROGRESS", accessExpiresAt: FUTURE, dueAt: DUE_YESTERDAY },
        NOW,
      ),
    ).toBe("overdue");
  });

  it("is not overdue before the due date", () => {
    expect(
      questionnaireRequestStatus(
        { status: "REQUESTED", accessExpiresAt: FUTURE, dueAt: DUE_TOMORROW },
        NOW,
      ),
    ).toBe("sent");
  });

  it("reports expired over overdue once the link has expired", () => {
    expect(
      questionnaireRequestStatus(
        { status: "REQUESTED", accessExpiresAt: PAST, dueAt: DUE_YESTERDAY },
        NOW,
      ),
    ).toBe("expired");
  });

  it("never reports overdue without a due date: sent until the link expires, then expired", () => {
    expect(
      questionnaireRequestStatus(
        { status: "REQUESTED", accessExpiresAt: FUTURE, dueAt: null },
        NOW,
      ),
    ).toBe("sent");
    expect(
      questionnaireRequestStatus({ status: "REQUESTED", accessExpiresAt: PAST, dueAt: null }, NOW),
    ).toBe("expired");
  });

  it("never reports completed or cancelled requests as overdue", () => {
    expect(
      questionnaireRequestStatus(
        { status: "COMPLETED", accessExpiresAt: FUTURE, dueAt: DUE_YESTERDAY },
        NOW,
      ),
    ).toBe("completed");
    expect(
      questionnaireRequestStatus(
        { status: "CANCELLED", accessExpiresAt: FUTURE, dueAt: DUE_YESTERDAY },
        NOW,
      ),
    ).toBe("cancelled");
  });
});

describe("isOpenQuestionnaireRequest", () => {
  it("allows resend and cancel for sent, opened, overdue and expired requests only", () => {
    expect(isOpenQuestionnaireRequest("sent")).toBe(true);
    expect(isOpenQuestionnaireRequest("opened")).toBe(true);
    expect(isOpenQuestionnaireRequest("overdue")).toBe(true);
    expect(isOpenQuestionnaireRequest("expired")).toBe(true);
    expect(isOpenQuestionnaireRequest("completed")).toBe(false);
    expect(isOpenQuestionnaireRequest("cancelled")).toBe(false);
  });
});
