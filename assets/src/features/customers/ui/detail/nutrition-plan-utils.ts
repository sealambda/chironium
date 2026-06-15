// Pure calculation helpers for the nutrition-plan dialog. This module is
// intentionally free of i18n / React imports so it can be unit-tested in
// isolation. User-facing labels live in the components that consume it.

// ─── Atwater constants ───────────────────────────────────────────────

/** Energy density of each macronutrient in kcal per gram (Atwater factors). */
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/** Slack (kcal) allowed between the macro-derived energy and the target before warning. */
export const TOLERANCE_KCAL = 10;

export type MacroKey = "proteinG" | "carbsG" | "fatG";

/** How a macro amount is entered: absolute grams, grams per kg bodyweight, or % of target kcal. */
export type MacroUnit = "gkg" | "percent" | "grams";

/** Macro amounts in grams, keyed by nutrient. */
export interface MacroGrams {
  protein: number;
  carbs: number;
  fat: number;
}

/** kcal-per-gram for each form field, so callers don't re-map keys. */
export const MACRO_KCAL_PER_G: Record<MacroKey, number> = {
  proteinG: KCAL_PER_G.protein,
  carbsG: KCAL_PER_G.carbs,
  fatG: KCAL_PER_G.fat,
};

// ─── Energy maths ────────────────────────────────────────────────────

/** Total energy (kcal) contributed by the macro grams, rounded to a whole number. */
export function totalKcalFromMacroGrams(macros: MacroGrams): number {
  return Math.round(
    macros.protein * KCAL_PER_G.protein +
      macros.carbs * KCAL_PER_G.carbs +
      macros.fat * KCAL_PER_G.fat,
  );
}

/**
 * Percentage of `totalKcal` supplied by a macro, rounded to a whole number.
 * Returns 0 for non-positive / non-finite inputs so callers never render NaN.
 */
export function computeMacroPct(grams: number, kcalPerGram: number, totalKcal: number): number {
  if (totalKcal <= 0 || !Number.isFinite(grams) || grams <= 0) {
    return 0;
  }
  return Math.round((grams * kcalPerGram * 100) / totalKcal);
}

/** Absolute difference (kcal) between the macro-derived energy and the target. */
export function macroBalanceDeltaKcal(macros: MacroGrams, targetKcal: number): number {
  return totalKcalFromMacroGrams(macros) - targetKcal;
}

/** Whether the macro mix sits within `TOLERANCE_KCAL` of the target energy. */
export function isMacroMixBalanced(macros: MacroGrams, targetKcal: number): boolean {
  return Math.abs(macroBalanceDeltaKcal(macros, targetKcal)) <= TOLERANCE_KCAL;
}

// ─── BMR (Mifflin–St Jeor) ───────────────────────────────────────────

/**
 * Basal metabolic rate (kcal/day) via the Mifflin–St Jeor equation.
 * `sex` selects the constant offset (+5 for male, −161 for female).
 */
export function computeBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: "MALE" | "FEMALE",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === "MALE" ? base + 5 : base - 161);
}

/**
 * Whole-years age from an ISO birth date. `referenceDate` is injectable so the
 * result is deterministic under test. Returns null for an unparseable date or a
 * non-positive age.
 */
export function ageFromBirthDate(
  birthDate: string,
  referenceDate: Date = new Date(),
): number | null {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

// ─── Macro redistribution (lock-aware) ───────────────────────────────

export interface RedistributeResult {
  /** New gram amount for every macro field. Locked fields keep their input value. */
  readonly values: Record<MacroKey, number>;
  /**
   * True when the locked macros alone already meet or exceed the target energy,
   * leaving no room to scale the unlocked macros. The unlocked macros are set to
   * 0 and the caller should surface a soft warning.
   */
  readonly lockedExceedsTarget: boolean;
}

interface MacroEntry {
  key: MacroKey;
  grams: number;
  factor: number;
}

function macroEntries(macros: MacroGrams): MacroEntry[] {
  return [
    { key: "proteinG", grams: macros.protein, factor: KCAL_PER_G.protein },
    { key: "carbsG", grams: macros.carbs, factor: KCAL_PER_G.carbs },
    { key: "fatG", grams: macros.fat, factor: KCAL_PER_G.fat },
  ];
}

/**
 * Scale the unlocked macros so the whole plan hits `targetKcal`, preserving the
 * existing ratio between the macros that move and keeping locked macros fixed.
 * The last unlocked macro absorbs the rounding remainder so the totals match
 * exactly. Pure: returns the new gram amounts rather than mutating form state.
 */
export function redistributeMacrosForTargetKcal(
  targetKcal: number,
  macros: MacroGrams,
  lockedFields: ReadonlySet<MacroKey> = new Set(),
): RedistributeResult {
  const entries = macroEntries(macros);
  const values: Record<MacroKey, number> = {
    proteinG: macros.protein,
    carbsG: macros.carbs,
    fatG: macros.fat,
  };

  if (targetKcal <= 0) {
    return { values, lockedExceedsTarget: false };
  }

  const unlocked = entries.filter((entry) => !lockedFields.has(entry.key));
  if (unlocked.length === 0) {
    const lockedKcal = entries.reduce((sum, entry) => sum + entry.grams * entry.factor, 0);
    return { values, lockedExceedsTarget: lockedKcal > targetKcal + TOLERANCE_KCAL };
  }

  const lockedKcal = entries
    .filter((entry) => lockedFields.has(entry.key))
    .reduce((sum, entry) => sum + entry.grams * entry.factor, 0);
  const remainingKcal = targetKcal - lockedKcal;

  if (remainingKcal <= 0) {
    for (const entry of unlocked) {
      values[entry.key] = 0;
    }
    return { values, lockedExceedsTarget: true };
  }

  const unlockedKcal = unlocked.reduce((sum, entry) => sum + entry.grams * entry.factor, 0);
  let distributed = 0;

  unlocked.forEach((entry, index) => {
    const isLast = index === unlocked.length - 1;
    if (isLast) {
      values[entry.key] = Math.max(0, Math.round((remainingKcal - distributed) / entry.factor));
      return;
    }
    const share =
      unlockedKcal > 0 ? (entry.grams * entry.factor) / unlockedKcal : 1 / unlocked.length;
    const grams = Math.max(0, Math.round((share * remainingKcal) / entry.factor));
    values[entry.key] = grams;
    distributed += grams * entry.factor;
  });

  return { values, lockedExceedsTarget: false };
}

// ─── Unit conversion (grams ⇄ g/kg ⇄ % kcal) ─────────────────────────

interface UnitConversionArgs {
  readonly unit: MacroUnit;
  readonly kcalPerGram: number;
  readonly totalKcal: number;
  readonly weightKg?: number;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Convert a value entered in the chosen unit into whole grams.
 * Returns 0 for empty / non-positive input (clears the field) and null when the
 * unit needs context that is missing (bodyweight for g/kg, target kcal for %).
 */
export function gramsFromUnitValue(args: UnitConversionArgs & { value: number }): number | null {
  const { unit, value, kcalPerGram, totalKcal, weightKg } = args;
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (unit === "grams") {
    return Math.round(value);
  }
  if (unit === "gkg") {
    if (!weightKg || weightKg <= 0) {
      return null;
    }
    return Math.round(value * weightKg);
  }
  if (totalKcal <= 0) {
    return null;
  }
  return Math.round(((value / 100) * totalKcal) / kcalPerGram);
}

/** Convert grams into the chosen unit. Returns 0 when the value can't be expressed. */
export function unitValueFromGrams(args: UnitConversionArgs & { grams: number }): number {
  const { unit, grams, kcalPerGram, totalKcal, weightKg } = args;
  if (!Number.isFinite(grams) || grams <= 0) {
    return 0;
  }
  if (unit === "grams") {
    return grams;
  }
  if (unit === "gkg") {
    if (!weightKg || weightKg <= 0) {
      return 0;
    }
    return roundTo(grams / weightKg, 2);
  }
  if (totalKcal <= 0) {
    return 0;
  }
  return roundTo((grams * kcalPerGram * 100) / totalKcal, 1);
}

/** Display string for a macro value in the chosen unit (empty when grams are unset). */
export function formatMacroUnitDisplay(args: UnitConversionArgs & { grams: number }): string {
  if (args.grams <= 0) {
    return "";
  }
  return String(unitValueFromGrams(args));
}

// ─── Preferred-unit selection ────────────────────────────────────────

/**
 * Best default unit given the available context: g/kg when bodyweight is known,
 * else % kcal when a target exists, else absolute grams.
 */
export function pickPreferredMacroUnit(
  weightKg: number | undefined,
  hasTargetKcal: boolean,
): MacroUnit {
  if (weightKg && weightKg > 0) {
    return "gkg";
  }
  if (hasTargetKcal) {
    return "percent";
  }
  return "grams";
}

/** The preferred unit applied uniformly to all three macro fields. */
export function macroUnitsAllPreferred(
  weightKg: number | undefined,
  hasTargetKcal: boolean,
): Record<MacroKey, MacroUnit> {
  const unit = pickPreferredMacroUnit(weightKg, hasTargetKcal);
  return { proteinG: unit, carbsG: unit, fatG: unit };
}
