import { endOfDay, formatISO, parse, startOfDay } from "date-fns";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAllergyIntolerance, updateAllergyIntolerance } from "./allergy-intolerance-api";

const requestGraphqlMock = vi.hoisted(() => vi.fn());

interface MutationRequest {
  readonly variables: {
    readonly input: unknown;
  };
}

function getMutationInput() {
  const request = requestGraphqlMock.mock.calls[0]?.[0] as MutationRequest | undefined;
  if (!request) {
    throw new Error("Expected requestGraphql to receive a mutation request.");
  }
  return request.variables.input;
}

vi.mock("@/shared/api/graphql", () => ({
  requestGraphql: requestGraphqlMock,
}));

describe("allergy intolerance mutations", () => {
  const toLocalStartIso = (date: string) =>
    formatISO(startOfDay(parse(date, "yyyy-MM-dd", new Date())));

  const toLocalEndIso = (date: string) =>
    formatISO(endOfDay(parse(date, "yyyy-MM-dd", new Date())));

  afterEach(() => {
    requestGraphqlMock.mockReset();
  });

  it("creates onset date values as offset-aware DateTime payloads", async () => {
    requestGraphqlMock.mockResolvedValueOnce({
      createAllergyIntolerance: { result: { id: "allergy-1", type: "ALLERGY" }, errors: null },
    });

    await createAllergyIntolerance(
      {
        type: "ALLERGY",
        name: "Pollen",
        clinicalStatus: "ACTIVE",
        verificationStatus: "CONFIRMED",
        onsetMode: "date",
        onsetDateTime: "2026-04-01",
      },
      "patient-1",
      "org-1",
    );

    expect(getMutationInput()).toMatchObject({
      type: "ALLERGY",
      clinicalStatus: "ACTIVE",
      verificationStatus: "CONFIRMED",
      code: { text: "Pollen" },
      onsetDateTime: toLocalStartIso("2026-04-01"),
      patientId: "patient-1",
    });
  });

  it("updates onset periods as offset-aware DateTime payloads", async () => {
    requestGraphqlMock.mockResolvedValueOnce({
      updateAllergyIntolerance: { result: { id: "allergy-1", type: "ALLERGY" }, errors: null },
    });

    await updateAllergyIntolerance(
      "allergy-1",
      {
        type: "ALLERGY",
        name: "Pollen",
        clinicalStatus: "ACTIVE",
        verificationStatus: "CONFIRMED",
        onsetMode: "period",
        onsetPeriod: {
          start: "2026-04-01",
          end: "2026-04-15",
        },
      },
      "org-1",
    );

    expect(getMutationInput()).toMatchObject({
      type: "ALLERGY",
      clinicalStatus: "ACTIVE",
      verificationStatus: "CONFIRMED",
      code: { text: "Pollen" },
      onsetPeriod: {
        start: toLocalStartIso("2026-04-01"),
        end: toLocalEndIso("2026-04-15"),
      },
    });
  });
});
