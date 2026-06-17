import { describe, expect, it } from "vitest";

import {
  ageFromBirthDate,
  computeBmr,
  computeMacroPct,
  formatMacroUnitDisplay,
  isMacroMixBalanced,
  type MacroGrams,
  type MacroKey,
  macroAdherenceSegments,
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
    const { values } = redistributeMacrosForTargetKcal(2000, { protein: 0, carbs: 0, fat: 0 });
    expect(values.proteinG).toBeGreaterThan(0);
    expect(values.carbsG).toBeGreaterThan(0);
    expect(values.fatG).toBeGreaterThan(0);
    expect(isMacroMixBalanced(gramsFromValues(values), 2000)).toBe(true);
  });

  it("balances when only one macro is unlocked (two locked)", () => {
    // protein 600 + fat 603 locked = 1203; carbs alone absorbs the remaining 397.
    const locked = new Set<MacroKey>(["proteinG", "fatG"]);
    const { values, lockedExceedsTarget } = redistributeMacrosForTargetKcal(1600, macros, locked);
    expect(lockedExceedsTarget).toBe(false);
    expect(values.proteinG).toBe(150);
    expect(values.fatG).toBe(67);
    expect(isMacroMixBalanced(gramsFromValues(values), 1600)).toBe(true);
  });

  it("uses the even fallback when the unlocked macros start at zero", () => {
    // Only protein has a value and it is locked; carbs+fat (both 0) split the rest.
    const locked = new Set<MacroKey>(["proteinG"]);
    const { values, lockedExceedsTarget } = redistributeMacrosForTargetKcal(
      1000,
      { protein: 100, carbs: 0, fat: 0 },
      locked,
    );
    expect(lockedExceedsTarget).toBe(false);
    expect(values.proteinG).toBe(100);
    expect(values.carbsG).toBeGreaterThan(0);
    expect(values.fatG).toBeGreaterThan(0);
    expect(isMacroMixBalanced(gramsFromValues(values), 1000)).toBe(true);
  });

  it("zeroes the unlocked macro and flags when locked exactly equals target", () => {
    // protein 600 + carbs 800 = 1400 locked, target 1400 → no room for fat.
    const locked = new Set<MacroKey>(["proteinG", "carbsG"]);
    const { values, lockedExceedsTarget } = redistributeMacrosForTargetKcal(1400, macros, locked);
    expect(lockedExceedsTarget).toBe(true);
    expect(values.fatG).toBe(0);
  });

  it("leaves an all-locked plan untouched, flagging only when it overshoots", () => {
    const locked = new Set<MacroKey>(["proteinG", "carbsG", "fatG"]);
    const within = redistributeMacrosForTargetKcal(2003, macros, locked);
    expect(within.lockedExceedsTarget).toBe(false);
    expect(within.values).toEqual({ proteinG: 150, carbsG: 200, fatG: 67 });
    expect(redistributeMacrosForTargetKcal(1000, macros, locked).lockedExceedsTarget).toBe(true);
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
      unitValueFromGrams({ unit: "percent", grams: 150, kcalPerGram: 4, totalKcal: 2000 }),
    ).toBe(30);
  });

  it("falls back to 0 when context is missing", () => {
    expect(unitValueFromGrams({ unit: "gkg", grams: 160, kcalPerGram: 4, totalKcal: 2000 })).toBe(
      0,
    );
    expect(unitValueFromGrams({ unit: "percent", grams: 150, kcalPerGram: 4, totalKcal: 0 })).toBe(
      0,
    );
    expect(unitValueFromGrams({ unit: "grams", grams: 0, kcalPerGram: 4, totalKcal: 2000 })).toBe(
      0,
    );
  });

  it("clamps negative grams to 0 across every unit", () => {
    expect(unitValueFromGrams({ unit: "grams", grams: -50, kcalPerGram: 4, totalKcal: 2000 })).toBe(
      0,
    );
    expect(
      unitValueFromGrams({ unit: "percent", grams: -50, kcalPerGram: 4, totalKcal: 2000 }),
    ).toBe(0);
    expect(
      unitValueFromGrams({
        unit: "gkg",
        grams: -50,
        kcalPerGram: 4,
        totalKcal: 2000,
        weightKg: 80,
      }),
    ).toBe(0);
  });
});

describe("formatMacroUnitDisplay", () => {
  it("is empty when grams are unset", () => {
    expect(
      formatMacroUnitDisplay({ unit: "grams", grams: 0, kcalPerGram: 4, totalKcal: 2000 }),
    ).toBe("");
  });

  it("renders the converted value", () => {
    expect(
      formatMacroUnitDisplay({ unit: "grams", grams: 150, kcalPerGram: 4, totalKcal: 2000 }),
    ).toBe("150");
  });
});

describe("macroAdherenceSegments", () => {
  it("fills the ring and keeps the split when on or over target", () => {
    // protein 100g=400, carbs 100g=400, fat 100g=900 → macroTotal 1700.
    const onTarget = macroAdherenceSegments({ protein: 100, carbs: 100, fat: 100 }, 1700);
    expect(onTarget.map((s) => s.id)).toEqual(["protein", "carbs", "fat"]);
    expect(onTarget[0]?.offset).toBe(0);
    expect(onTarget[0]?.fraction).toBeCloseTo(400 / 1700, 5);
    expect(onTarget.reduce((sum, s) => sum + s.fraction, 0)).toBeCloseTo(1, 5);

    // Over target → ring still full, proportional split (denom = macroTotal).
    const over = macroAdherenceSegments({ protein: 100, carbs: 100, fat: 100 }, 1000);
    expect(over.reduce((sum, s) => sum + s.fraction, 0)).toBeCloseTo(1, 5);
    expect(over[0]?.fraction).toBeCloseTo(400 / 1700, 5);
  });

  it("leaves a muted gap proportional to the deficit when under target", () => {
    // macroTotal 1700 of a 3400 target → ring half filled, half gap.
    const under = macroAdherenceSegments({ protein: 100, carbs: 100, fat: 100 }, 3400);
    expect(under.reduce((sum, s) => sum + s.fraction, 0)).toBeCloseTo(0.5, 5);
    expect(under[0]?.offset).toBe(0);
    expect(under[0]?.fraction).toBeCloseTo(400 / 3400, 5);
    expect(under[1]?.offset).toBeCloseTo(400 / 3400, 5);
  });

  it("returns no segments for an empty plan or non-positive target", () => {
    expect(macroAdherenceSegments({ protein: 0, carbs: 0, fat: 0 }, 2000)).toEqual([]);
    expect(macroAdherenceSegments({ protein: 100, carbs: 0, fat: 0 }, 0)).toEqual([]);
  });
});

describe("macro percentage basis", () => {
  it("card % and dialog % both divide by target kcal", () => {
    // 150 g protein × 4 = 600 kcal of a 2000 target = 30% on both surfaces.
    const cardPct = computeMacroPct(150, 4, 2000);
    const dialogPct = unitValueFromGrams({
      unit: "percent",
      grams: 150,
      kcalPerGram: 4,
      totalKcal: 2000,
    });
    expect(cardPct).toBe(30);
    expect(cardPct).toBe(Math.round(dialogPct));
  });
});

it("exposes a sane tolerance constant", () => {
  expect(TOLERANCE_KCAL).toBeGreaterThan(0);
});
