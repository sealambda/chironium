import { describe, expect, it } from "vitest";

import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";

import {
  buildAnthropometryFormDefaults,
  hasAdvancedAnthropometryValues,
} from "./anthropometry-form-defaults";

const CURRENT_DATE = new Date(2026, 3, 30, 14, 7);

describe("anthropometry defaults", () => {
  it("uses current date and time with empty measurements when no latest record exists", () => {
    expect(buildAnthropometryFormDefaults(null, CURRENT_DATE)).toEqual({
      effectiveDateTime: "2026-04-30",
      effectiveTime: "14:07",
      weightKg: "",
      heightCm: "",
      chestCm: "",
      waistCm: "",
      hipCm: "",
      armCm: "",
      thighCm: "",
    });
  });

  it("prefills measurements from the latest record without cloning its timestamp", () => {
    const latest: AnthropometricSnapshot = {
      date: "2026-01-15T08:30:00Z",
      weight: 71.5,
      height: 173,
      chest: 95.5,
      waist: 82,
      hip: 101,
      arm: 31.25,
      thigh: 54,
    };

    expect(buildAnthropometryFormDefaults(latest, CURRENT_DATE)).toEqual({
      effectiveDateTime: "2026-04-30",
      effectiveTime: "14:07",
      weightKg: "71.5",
      heightCm: "173",
      chestCm: "95.5",
      waistCm: "82",
      hipCm: "101",
      armCm: "31.25",
      thighCm: "54",
    });
  });
});

describe("advanced anthropometry visibility", () => {
  it("detects whether the latest record has circumference values", () => {
    expect(hasAdvancedAnthropometryValues(null)).toBe(false);
    expect(hasAdvancedAnthropometryValues({ date: "2026-01-15", weight: 71.5 })).toBe(false);
    expect(hasAdvancedAnthropometryValues({ date: "2026-01-15", waist: 0 })).toBe(true);
  });
});
