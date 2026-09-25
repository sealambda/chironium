import { describe, expect, it } from "vitest";

import type { ObservationsPage } from "@/features/customers/api/observations-api";
import type { PatientObservation } from "@/features/customers/api/patients-api";
import {
  type FeedEvent,
  isSelfReportedEvent,
  matchesFeedFilter,
} from "@/features/customers/types/activity-feed";
import { buildActivityFeedEvents } from "@/features/customers/utils/activity-feed-normalizers";
import type { QuestionnaireResponseRecord } from "@/features/questionnaires/api/questionnaire-responses-api";
import { isQuestionnaireRequestTask, type PatientTask } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";

const NOW = new Date("2026-09-25T12:00:00.000Z");
const EMPTY_PAGE: ObservationsPage = { items: [], count: 0, endKeyset: null };

const STAFF_VERSION = {
  versionActionName: "request_questionnaire",
  versionInsertedAt: "2026-09-20T09:00:00.000Z",
  changedBy: { id: "user-1", name: "Alex Staff" },
  changedByPractitioner: null,
  changedByPatient: null,
};

const PATIENT_VERSION = {
  versionActionName: "start",
  versionInsertedAt: "2026-09-21T09:00:00.000Z",
  changedBy: null,
  changedByPractitioner: null,
  changedByPatient: { id: "patient-1" },
};

function buildTask(overrides: Partial<PatientTask>): PatientTask {
  return {
    id: "task-1",
    intent: "ORDER",
    status: "REQUESTED",
    priority: null,
    description: null,
    requestedPeriod: { start: "2026-09-20T09:00:00.000Z", end: null },
    accessExpiresAt: "2026-09-27T09:00:00.000Z",
    focusQuestionnaireId: "questionnaire-1",
    focusQuestionnaire: { id: "questionnaire-1", title: "Intake" },
    requesterName: "Dana Requester",
    outputQuestionnaireResponse: null,
    note: null,
    paperTrailVersions: [STAFF_VERSION],
    ...overrides,
  } as PatientTask;
}

function buildResponse(
  overrides: Partial<QuestionnaireResponseRecord>,
): QuestionnaireResponseRecord {
  return {
    id: "response-1",
    status: "COMPLETED",
    authored: "2026-09-22T10:00:00.000Z",
    item: [],
    questionnaire: { id: "questionnaire-1", title: "Intake" },
    author: null,
    authorPatient: null,
    selfReported: false,
    ...overrides,
  } as QuestionnaireResponseRecord;
}

function buildObservation(overrides: Partial<PatientObservation>): PatientObservation {
  return {
    id: "observation-1",
    status: "FINAL",
    observationType: null,
    code: null,
    effectiveDateTime: "2026-09-22T10:00:00.000Z",
    selfReported: false,
    valueString: "Feeling better.",
    valueDateTime: null,
    valueQuantity: null,
    valueCodeableConcept: null,
    note: [],
    paperTrailVersions: [],
    ...overrides,
  } as PatientObservation;
}

function build(
  input: Partial<Parameters<typeof buildActivityFeedEvents>[0]>,
): ReturnType<typeof buildActivityFeedEvents> {
  return buildActivityFeedEvents({
    observations: EMPTY_PAGE,
    tasks: [],
    goals: [],
    subscriptions: [],
    anthropometry: [],
    conditions: [],
    allergyIntolerances: [],
    medications: [],
    prescriptions: [],
    foodPreferences: [],
    menstrualCycles: [],
    nutritionPlans: [],
    questionnaireResponses: [],
    activeFilter: "all",
    now: NOW,
    ...input,
  });
}

function onlyEvent<Kind extends FeedEvent["kind"]>(
  events: FeedEvent[],
  kind: Kind,
): Extract<FeedEvent, { kind: Kind }> {
  expect(events).toHaveLength(1);
  const [event] = events;
  expect(event?.kind).toBe(kind);
  return event as Extract<FeedEvent, { kind: Kind }>;
}

describe("questionnaire request tasks", () => {
  it("become a single questionnaire-request event, never a reminder", () => {
    const events = build({ tasks: [buildTask({})] });

    const event = onlyEvent(events, "questionnaire-request");
    expect(event.id).toBe("task-1");
    expect(event.date).toBe("2026-09-20T09:00:00.000Z");
    expect(event.status).toBe("sent");
  });

  it("keeps plain reminders as task events", () => {
    const events = build({
      tasks: [buildTask({ focusQuestionnaireId: null, focusQuestionnaire: null })],
    });

    onlyEvent(events, "task");
  });

  it("still routes a request whose questionnaire can no longer be read", () => {
    const task = buildTask({ focusQuestionnaire: null });

    expect(isQuestionnaireRequestTask(task)).toBe(true);
    onlyEvent(build({ tasks: [task] }), "questionnaire-request");
  });

  it("derives the status against the given time", () => {
    const events = build({
      tasks: [buildTask({ status: "IN_PROGRESS", accessExpiresAt: "2026-09-24T09:00:00.000Z" })],
    });

    expect(onlyEvent(events, "questionnaire-request").status).toBe("expired");
  });

  it("names the staff member who sent it", () => {
    const events = build({ tasks: [buildTask({})], personName: "Maria Lopez" });

    expect(onlyEvent(events, "questionnaire-request").actors).toEqual([
      { name: "Alex Staff", id: "user-1" },
    ]);
  });

  it("falls back to the requester name when only a patient version is loaded", () => {
    const events = build({
      tasks: [buildTask({ paperTrailVersions: [PATIENT_VERSION] })],
      personName: "Maria Lopez",
    });

    expect(onlyEvent(events, "questionnaire-request").actors).toEqual([{ name: "Dana Requester" }]);
  });
});

describe("feed filters", () => {
  const tasks = [
    buildTask({}),
    buildTask({ id: "task-2", focusQuestionnaireId: null, focusQuestionnaire: null }),
  ];
  const questionnaireResponses = [buildResponse({})];

  it("shows requests and responses under the questionnaire filter", () => {
    const kinds = build({ tasks, questionnaireResponses, activeFilter: "questionnaire" }).map(
      (event) => event.kind,
    );

    expect(kinds.sort()).toEqual(["questionnaire", "questionnaire-request"]);
  });

  it("keeps requests out of the task filter", () => {
    const kinds = build({ tasks, questionnaireResponses, activeFilter: "task" }).map(
      (event) => event.kind,
    );

    expect(kinds).toEqual(["task"]);
  });

  it("matches kinds against filters", () => {
    expect(matchesFeedFilter("questionnaire-request", "all")).toBe(true);
    expect(matchesFeedFilter("questionnaire-request", "questionnaire")).toBe(true);
    expect(matchesFeedFilter("questionnaire-request", "task")).toBe(false);
    expect(matchesFeedFilter("goal", "goal")).toBe(true);
  });
});

describe("patient attribution", () => {
  it("attributes a patient's change to the patient by name", () => {
    const observations: ObservationsPage = {
      items: [buildObservation({ paperTrailVersions: [PATIENT_VERSION] })],
      count: 1,
      endKeyset: null,
    };

    const events = build({ observations, personName: "Maria Lopez" });

    expect(onlyEvent(events, "observation").actors).toEqual([
      { name: "Maria Lopez", id: "patient-1" },
    ]);
  });

  it("uses a generic label when the patient's name is unknown", () => {
    const observations: ObservationsPage = {
      items: [buildObservation({ paperTrailVersions: [PATIENT_VERSION] })],
      count: 1,
      endKeyset: null,
    };

    const events = build({ observations });

    expect(onlyEvent(events, "observation").actors).toEqual([
      { name: m.activity_actor_patient(), id: "patient-1" },
    ]);
  });

  it("attributes a self-reported response to the patient", () => {
    const events = build({
      questionnaireResponses: [
        buildResponse({ authorPatient: { id: "patient-1" }, selfReported: true }),
      ],
      personName: "Maria Lopez",
    });

    const event = onlyEvent(events, "questionnaire");
    expect(event.actors).toEqual([{ name: "Maria Lopez", id: "patient-1" }]);
    expect(isSelfReportedEvent(event)).toBe(true);
  });

  it("keeps the practitioner as the author of a response they recorded", () => {
    const events = build({
      questionnaireResponses: [
        buildResponse({ author: { id: "practitioner-1", name: [{ text: "Dana Requester" }] } }),
      ],
    });

    const event = onlyEvent(events, "questionnaire");
    expect(event.actors).toEqual([{ name: "Dana Requester", id: "practitioner-1" }]);
    expect(isSelfReportedEvent(event)).toBe(false);
  });
});

describe("isSelfReportedEvent", () => {
  it("flags anthropometry when any of its values is self-reported", () => {
    const events = build({
      anthropometry: [
        {
          date: "2026-09-22T10:00:00.000Z",
          weight: 70,
          waist: 80,
          observations: {
            weight: { id: "weight-1", note: [], selfReported: false },
            waist: { id: "waist-1", note: [], selfReported: true },
          },
        },
      ],
    });

    expect(isSelfReportedEvent(onlyEvent(events, "anthropometry"))).toBe(true);
  });

  it("does not flag observations recorded by staff", () => {
    const events = build({
      observations: { items: [buildObservation({})], count: 1, endKeyset: null },
    });

    expect(isSelfReportedEvent(onlyEvent(events, "observation"))).toBe(false);
  });
});
