import { describe, expect, it } from "vitest";

import {
  ageFromBirthDate,
  computeBmr,
  computeMacroPct,
  formatMacroUnitDisplay,
  isMacroMixBalanced,
  type MacroGrams,
  type MacroKey,
  macroArcSegments,
  redistributeMacrosForTargetKcal,
  TOLERANCE_KCAL,
  totalKcalFromMacroGrams,
  unitValueFromGrams,
} from "./nutrition-plan-utils";

function gramsFromValues(values: Record<MacroKey, number>): MacroGrams {
  return { protein: values.proteinG, carbs: values.carbsG, fat: values.fatG };
}

describe("totalKcalFromMacroGrams", () => {
  it("sums macros with Atwater factors", () => {
    expect(totalKcalFromMacroGrams({ protein: 150, carbs: 200, fat: 67 })).toBe(2003);
  });

  it("is zero for an empty plan", () => {
    expect(totalKcalFromMacroGrams({ protein: 0, carbs: 0, fat: 0 })).toBe(0);
  });
});

describe("computeMacroPct", () => {
  it("returns the share of total energy as a whole percent", () => {
    // 150 g protein × 4 = 600 kcal of 2000 = 30%.
    expect(computeMacroPct(150, 4, 2000)).toBe(30);
  });

  it("guards against zero/negative inputs", () => {
    expect(computeMacroPct(150, 4, 0)).toBe(0);
    expect(computeMacroPct(0, 4, 2000)).toBe(0);
    expect(computeMacroPct(-10, 4, 2000)).toBe(0);
    expect(computeMacroPct(Number.NaN, 4, 2000)).toBe(0);
  });
});

describe("isMacroMixBalanced", () => {
  it("accepts a mix within tolerance of the target", () => {
    expect(isMacroMixBalanced({ protein: 150, carbs: 200, fat: 67 }, 2003)).toBe(true);
    expect(isMacroMixBalanced({ protein: 150, carbs: 200, fat: 67 }, 2000)).toBe(true); // delta 3
  });

  it("rejects a mix beyond tolerance", () => {
    expect(isMacroMixBalanced({ protein: 150, carbs: 200, fat: 67 }, 1800)).toBe(false);
  });
});

describe("computeBmr (Mifflin–St Jeor)", () => {
  it("applies the +5 offset for males", () => {
    // 10·80 + 6.25·180 − 5·30 + 5 = 800 + 1125 − 150 + 5 = 1780
    expect(computeBmr(80, 180, 30, "MALE")).toBe(1780);
  });

  it("applies the −161 offset for females", () => {
    // 10·60 + 6.25·165 − 5·30 − 161 = 600 + 1031.25 − 150 − 161 = 1320.25 → 1320
    expect(computeBmr(60, 165, 30, "FEMALE")).toBe(1320);
  });
});

describe("ageFromBirthDate", () => {
  const reference = new Date(2026, 5, 15); // 2026-06-15, deterministic

  it("computes whole-years age when the birthday has passed this year", () => {
    expect(ageFromBirthDate("1990-03-10", reference)).toBe(36);
  });

  it("subtracts a year when the birthday has not yet occurred", () => {
    expect(ageFromBirthDate("1990-09-20", reference)).toBe(35);
  });

  it("returns null for an unparseable date", () => {
    expect(ageFromBirthDate("not-a-date", reference)).toBeNull();
  });

  it("returns null for a future birth date", () => {
    expect(ageFromBirthDate("2030-03-10", reference)).toBeNull();
  });
});

describe("redistributeMacrosForTargetKcal", () => {
  const macros: MacroGrams = { protein: 150, carbs: 200, fat: 67 }; // 2003 kcal

  it("scales all macros to hit a new target, staying balanced", () => {
    const { values, lockedExceedsTarget } = redistributeMacrosForTargetKcal(1000, macros);
    expect(lockedExceedsTarget).toBe(false);
    expect(isMacroMixBalanced(gramsFromValues(values), 1000)).toBe(true);
  });

  it("keeps a locked macro fixed and scales the rest", () => {
    const locked = new Set<MacroKey>(["proteinG"]);
    const { values, lockedExceedsTarget } = redistributeMacrosForTargetKcal(1200, macros, locked);
    expect(lockedExceedsTarget).toBe(false);
    expect(values.proteinG).toBe(150);
    expect(isMacroMixBalanced(gramsFromValues(values), 1200)).toBe(true);
  });

  it("flags when locked macros already exceed the target", () => {
    const locked = new Set<MacroKey>(["proteinG", "carbsG"]); // 600 + 800 = 1400 kcal
    const { values, lockedExceedsTarget } = redistributeMacrosForTargetKcal(1000, macros, locked);
    expect(lockedExceedsTarget).toBe(true);
    expect(values.proteinG).toBe(150);
    expect(values.carbsG).toBe(200);
    expect(values.fatG).toBe(0);
  });

  it("returns the input unchanged for a non-positive target", () => {
    expect(redistributeMacrosForTargetKcal(0, macros).values).toEqual({
      proteinG: 150,
      carbsG: 200,
      fatG: 67,
    });
  });

  it("distributes evenly from an all-zero plan", () => {
    const { values } = redistributeMacrosForTargetKcal(2000, {
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    expect(values.proteinG).toBeGreaterThan(0);
    expect(values.carbsG).toBeGreaterThan(0);
    expect(values.fatG).toBeGreaterThan(0);
    expect(isMacroMixBalanced(gramsFromValues(values), 2000)).toBe(true);
  });
});

describe("unitValueFromGrams", () => {
  it("round-trips g/kg", () => {
    expect(
      unitValueFromGrams({
        unit: "gkg",
        grams: 160,
        kcalPerGram: 4,
        totalKcal: 2000,
        weightKg: 80,
      }),
    ).toBe(2);
  });

  it("round-trips % of kcal", () => {
    expect(
      unitValueFromGrams({
        unit: "percent",
        grams: 150,
        kcalPerGram: 4,
        totalKcal: 2000,
      }),
    ).toBe(30);
  });

  it("falls back to 0 when context is missing", () => {
    expect(
      unitValueFromGrams({
        unit: "gkg",
        grams: 160,
        kcalPerGram: 4,
        totalKcal: 2000,
      }),
    ).toBe(0);
    expect(
      unitValueFromGrams({
        unit: "percent",
        grams: 150,
        kcalPerGram: 4,
        totalKcal: 0,
      }),
    ).toBe(0);
    expect(
      unitValueFromGrams({
        unit: "grams",
        grams: 0,
        kcalPerGram: 4,
        totalKcal: 2000,
      }),
    ).toBe(0);
  });
});

describe("formatMacroUnitDisplay", () => {
  it("is empty when grams are unset", () => {
    expect(
      formatMacroUnitDisplay({
        unit: "grams",
        grams: 0,
        kcalPerGram: 4,
        totalKcal: 2000,
      }),
    ).toBe("");
  });

  it("renders the converted value", () => {
    expect(
      formatMacroUnitDisplay({
        unit: "grams",
        grams: 150,
        kcalPerGram: 4,
        totalKcal: 2000,
      }),
    ).toBe("150");
  });
});

describe("macroArcSegments", () => {
  it("sizes segments by each macro's energy share and chains offsets", () => {
    // protein 100g=400, carbs 100g=400, fat 100g=900 → total 1700 kcal.
    const segments = macroArcSegments({ protein: 100, carbs: 100, fat: 100 });
    expect(segments.map((s) => s.id)).toEqual(["protein", "carbs", "fat"]);
    expect(segments[0]?.offset).toBe(0);
    expect(segments[0]?.fraction).toBeCloseTo(400 / 1700, 5);
    expect(segments[1]?.offset).toBeCloseTo(400 / 1700, 5);
    expect(segments[2]?.offset).toBeCloseTo(800 / 1700, 5);
    // Fractions cover the whole ring.
    const total = segments.reduce((sum, s) => sum + s.fraction, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("returns no segments for an empty plan", () => {
    expect(macroArcSegments({ protein: 0, carbs: 0, fat: 0 })).toEqual([]);
  });
});

it("exposes a sane tolerance constant", () => {
  expect(TOLERANCE_KCAL).toBeGreaterThan(0);
});
