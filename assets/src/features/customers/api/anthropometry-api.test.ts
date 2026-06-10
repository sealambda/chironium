import { describe, expect, it } from "vitest";

import { selectAnthropometryHistory } from "./anthropometry-api";
import type { PatientObservation } from "./patients-api";

function buildObservation(overrides: Partial<PatientObservation>): PatientObservation {
  return {
    id: "observation-1",
    status: "FINAL",
    observationType: "BODY_WEIGHT",
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

function quantity(value: number): PatientObservation["valueQuantity"] {
  return { value: String(value), unit: null, system: null, code: null };
}

describe("selectAnthropometryHistory", () => {
  it("returns an empty array when there are no observations", () => {
    expect(selectAnthropometryHistory(null)).toEqual([]);
    expect(selectAnthropometryHistory(undefined)).toEqual([]);
    expect(selectAnthropometryHistory([])).toEqual([]);
  });

  it("groups measurements recorded on the same day into one snapshot", () => {
    const history = selectAnthropometryHistory([
      buildObservation({
        id: "weight",
        observationType: "BODY_WEIGHT",
        effectiveDateTime: "2026-03-01T08:00:00Z",
        valueQuantity: quantity(80),
      }),
      buildObservation({
        id: "height",
        observationType: "BODY_HEIGHT",
        effectiveDateTime: "2026-03-01T09:30:00Z",
        valueQuantity: quantity(180),
      }),
    ]);

    expect(history).toHaveLength(1);
    expect(history[0]?.weight).toBe(80);
    expect(history[0]?.height).toBe(180);
  });

  it("keeps different days as separate snapshots sorted newest first", () => {
    const history = selectAnthropometryHistory([
      buildObservation({
        observationType: "BODY_WEIGHT",
        effectiveDateTime: "2026-01-10T08:00:00Z",
        valueQuantity: quantity(82),
      }),
      buildObservation({
        observationType: "BODY_WEIGHT",
        effectiveDateTime: "2026-02-20T08:00:00Z",
        valueQuantity: quantity(79),
      }),
    ]);

    expect(history).toHaveLength(2);
    expect(history[0]?.weight).toBe(79);
    expect(history[1]?.weight).toBe(82);
  });

  it("maps each observation type to its snapshot field", () => {
    const history = selectAnthropometryHistory([
      buildObservation({
        observationType: "BMI",
        effectiveDateTime: "2026-03-01T08:00:00Z",
        valueQuantity: quantity(24.7),
      }),
      buildObservation({
        observationType: "WAIST_HIP_RATIO",
        effectiveDateTime: "2026-03-01T08:00:00Z",
        valueQuantity: quantity(0.9),
      }),
      buildObservation({
        observationType: "CHEST_CIRCUMFERENCE",
        effectiveDateTime: "2026-03-01T08:00:00Z",
        valueQuantity: quantity(100),
      }),
    ]);

    expect(history[0]?.bmi).toBe(24.7);
    expect(history[0]?.whr).toBe(0.9);
    expect(history[0]?.chest).toBe(100);
  });

  it("ignores observations without a date or with an unrelated type", () => {
    const history = selectAnthropometryHistory([
      buildObservation({
        observationType: "BODY_WEIGHT",
        effectiveDateTime: null,
        valueQuantity: quantity(80),
      }),
      buildObservation({
        observationType: "MENSTRUAL_PERIOD_START",
        effectiveDateTime: "2026-03-01T08:00:00Z",
      }),
    ]);

    expect(history).toEqual([]);
  });

  it("records the first merged observation as the snapshot primary", () => {
    const note = [
      { text: "Morning reading", time: null, authorReference: null, authorString: null },
    ];
    const history = selectAnthropometryHistory([
      buildObservation({
        id: "primary",
        observationType: "BODY_WEIGHT",
        effectiveDateTime: "2026-03-01T08:00:00Z",
        valueQuantity: quantity(80),
        note,
      }),
    ]);

    expect(history[0]?.primaryObservationId).toBe("primary");
    expect(history[0]?.notes).toEqual(note);
    expect(history[0]?.observations?.weight?.id).toBe("primary");
  });
});
