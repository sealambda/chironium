import { describe, expect, it } from "vitest";

import {
  selectAnthropometryHistory,
  selectCurrentStateSnapshot,
  selfReportedAnthropometryKeys,
} from "@/features/customers/api/anthropometry-api.selectors";
import type { PatientObservation } from "@/features/customers/api/patients-api";

function buildObservation(overrides: Partial<PatientObservation>): PatientObservation {
  return {
    id: "observation-1",
    status: "FINAL",
    observationType: "BODY_WEIGHT",
    code: null,
    effectiveDateTime: "2026-09-22T10:00:00.000Z",
    selfReported: false,
    valueString: null,
    valueDateTime: null,
    valueQuantity: { value: "70", unit: "kg", system: null, code: "kg" },
    valueCodeableConcept: null,
    note: [],
    paperTrailVersions: [],
    ...overrides,
  } as PatientObservation;
}

describe("selectCurrentStateSnapshot", () => {
  it("keeps each value's source observation, including whether it was self-reported", () => {
    const history = selectAnthropometryHistory([
      // Latest weight, reported by the patient.
      buildObservation({
        id: "weight-new",
        effectiveDateTime: "2026-09-22T10:00:00.000Z",
        selfReported: true,
        valueQuantity: { value: "71", unit: "kg", system: null, code: "kg" },
      }),
      // Older height, measured by staff.
      buildObservation({
        id: "height-old",
        observationType: "BODY_HEIGHT",
        effectiveDateTime: "2026-08-01T10:00:00.000Z",
        valueQuantity: { value: "175", unit: "cm", system: null, code: "cm" },
      }),
    ]);

    const current = selectCurrentStateSnapshot(history);

    expect(current?.weight).toBe(71);
    expect(current?.height).toBe(175);
    expect(current?.observations?.weight?.id).toBe("weight-new");
    expect(current?.observations?.height?.id).toBe("height-old");
    expect(current ? selfReportedAnthropometryKeys(current) : []).toEqual(["weight"]);
  });

  it("returns null for an empty history", () => {
    expect(selectCurrentStateSnapshot([])).toBeNull();
  });
});

describe("selfReportedAnthropometryKeys", () => {
  it("ignores self-reported refs without a value", () => {
    expect(
      selfReportedAnthropometryKeys({
        date: "2026-09-22T10:00:00.000Z",
        observations: { waist: { id: "waist-1", note: [], selfReported: true } },
      }),
    ).toEqual([]);
  });
});

describe("selectAnthropometryHistory", () => {
  it("shows the latest value of a field when a day holds several", () => {
    const [day] = selectAnthropometryHistory([
      buildObservation({
        id: "weight-late",
        effectiveDateTime: "2026-09-22T18:00:00.000Z",
        valueQuantity: { value: "70", unit: "kg", system: null, code: "kg" },
      }),
      buildObservation({
        id: "weight-early",
        effectiveDateTime: "2026-09-22T10:00:00.000Z",
        valueQuantity: { value: "80", unit: "kg", system: null, code: "kg" },
      }),
    ]);

    expect(day?.weight).toBe(70);
    expect(day?.observations?.weight?.id).toBe("weight-late");
  });

  it("groups days in the given timezone", () => {
    const history = selectAnthropometryHistory(
      [
        buildObservation({ id: "morning", effectiveDateTime: "2026-09-22T10:00:00.000Z" }),
        // 00:30 on the 23rd in Madrid, still the 22nd in UTC.
        buildObservation({ id: "after-midnight", effectiveDateTime: "2026-09-22T22:30:00.000Z" }),
      ],
      "Europe/Madrid",
    );

    expect(history).toHaveLength(2);
  });
});
