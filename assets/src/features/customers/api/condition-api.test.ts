import { formatISO, parse, startOfDay } from "date-fns";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TerminologyTag } from "@/shared/types/terminology";

import { createConditionsFromTags, updateCondition } from "./condition-api";

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

describe("condition mutations", () => {
  const toLocalStartIso = (date: string) =>
    formatISO(startOfDay(parse(date, "yyyy-MM-dd", new Date())));

  afterEach(() => {
    requestGraphqlMock.mockReset();
  });

  it("creates conditions without sending recordedDate", async () => {
    const tag: TerminologyTag = {
      label: "Asthma",
      coding: {
        system: "http://snomed.info/sct",
        code: "195967001",
        version: "20260301",
      },
    };
    requestGraphqlMock.mockResolvedValueOnce({
      createCondition: { result: { id: "condition-1" }, errors: null },
    });

    await createConditionsFromTags([tag], "patient-1", "org-1", {
      clinicalStatus: "ACTIVE",
      verificationStatus: "CONFIRMED",
      onsetDateTime: toLocalStartIso("2026-04-01"),
    });

    const input = getMutationInput();
    expect(input).toMatchObject({
      clinicalStatus: "ACTIVE",
      verificationStatus: "CONFIRMED",
      onsetDateTime: toLocalStartIso("2026-04-01"),
      subjectId: "patient-1",
      code: {
        text: "Asthma",
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "195967001",
            version: "20260301",
          },
        ],
      },
    });
    expect(input).not.toHaveProperty("recordedDate");
  });

  it("updates conditions without sending recordedDate", async () => {
    requestGraphqlMock.mockResolvedValueOnce({
      updateCondition: {
        result: { id: "condition-1", note: [] },
        errors: null,
      },
    });

    await updateCondition(
      "condition-1",
      {
        name: "Asthma",
        clinicalStatus: "RESOLVED",
        verificationStatus: "CONFIRMED",
        onsetDate: "2026-04-01",
        abatementDate: "2026-04-15",
      },
      "org-1",
    );

    const input = getMutationInput();
    expect(input).toEqual({
      clinicalStatus: "RESOLVED",
      verificationStatus: "CONFIRMED",
      code: { text: "Asthma" },
      onsetDateTime: toLocalStartIso("2026-04-01"),
      abatementDateTime: toLocalStartIso("2026-04-15"),
    });
    expect(input).not.toHaveProperty("recordedDate");
  });
});
