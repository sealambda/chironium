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

describe("isOpenQuestionnaireRequest", () => {
  it("allows resend and cancel for sent, opened and expired requests only", () => {
    expect(isOpenQuestionnaireRequest("sent")).toBe(true);
    expect(isOpenQuestionnaireRequest("opened")).toBe(true);
    expect(isOpenQuestionnaireRequest("expired")).toBe(true);
    expect(isOpenQuestionnaireRequest("completed")).toBe(false);
    expect(isOpenQuestionnaireRequest("cancelled")).toBe(false);
  });
});
