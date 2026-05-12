import { describe, expect, it } from "vitest";

import type { PatientObservation } from "./patients-api";
import { selectLatestMenstrualCycle } from "./observations-api";

function buildObservation(
  overrides: Partial<PatientObservation>,
): PatientObservation {
  return {
    id: "observation-1",
    status: "FINAL",
    observationType: "MENSTRUAL_PERIOD_START",
    code: null,
    effectiveDateTime: null,
    valueString: null,
    valueDateTime: null,
    valueQuantity: null,
    valueCodeableConcept: null,
    note: [],
    paperTrailVersions: [],
    ...overrides,
  } as PatientObservation;
}

describe("menstrual cycle selectors", () => {
  it("keeps the original local cycle start date after storing a UTC-normalized DateTime", () => {
    const localMidnightIso = new Date(2026, 4, 12, 0, 0).toISOString();

    const summary = selectLatestMenstrualCycle([
      buildObservation({
        effectiveDateTime: localMidnightIso,
        valueDateTime: localMidnightIso,
      }),
    ]);

    expect(summary?.startDate).toBe("2026-05-12");
  });
});