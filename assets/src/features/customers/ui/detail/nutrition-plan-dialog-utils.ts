import { z } from "zod";

import * as m from "@/paraglide/messages";

// ─── Atwater constants & helpers ────────────────────────────────────

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;
export const TOLERANCE_KCAL = 10;

export function totalKcalFromMacroGrams(macros: {
  protein: number;
  carbs: number;
  fat: number;
}): number {
  return Math.round(
    macros.protein * KCAL_PER_G.protein +
      macros.carbs * KCAL_PER_G.carbs +
      macros.fat * KCAL_PER_G.fat,
  );
}

export function computeMacroPct(grams: number, kcalPerG: number, totalKcal: number): number {
  if (totalKcal <= 0 || !Number.isFinite(grams) || grams <= 0) {
    return 0;
  }
  return Math.round((grams * kcalPerG * 100) / totalKcal);
}

// ─── Zod schema (string form values; no coerce/type mismatch) ───────

const positiveIntegerString = z
  .string()
  .trim()
  .refine((s) => s.length > 0, { message: m.validation_positive_number() })
  .refine(
    (s) => {
      const n = Number(s);
      return Number.isFinite(n) && Number.isInteger(n) && n > 0;
    },
    { message: m.validation_positive_number() },
  );

export const nutritionPlanFormSchema = z
  .object({
    targetKcal: positiveIntegerString,
    proteinG: positiveIntegerString,
    carbsG: positiveIntegerString,
    fatG: positiveIntegerString,
  })
  .refine(
    (d) => {
      const targetKcal = Number(d.targetKcal);
      const proteinG = Number(d.proteinG);
      const carbsG = Number(d.carbsG);
      const fatG = Number(d.fatG);
      const macroKcal =
        proteinG * KCAL_PER_G.protein + carbsG * KCAL_PER_G.carbs + fatG * KCAL_PER_G.fat;
      return Math.abs(macroKcal - targetKcal) <= TOLERANCE_KCAL;
    },
    { message: m.validation_macro_balance() },
  );

// ─── BMR (Mifflin-St Jeor) ──────────────────────────────────────────

export function computeBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: "MALE" | "FEMALE",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === "MALE" ? base + 5 : base - 161);
}

export function ageFromBirthDate(birthDate: string): number | null {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

// ─── Macro redistribution ────────────────────────────────────────────

export type MacroKey = "proteinG" | "carbsG" | "fatG";
export type MacroUnit = "gkg" | "percent" | "grams";

interface MacroInfo {
  key: MacroKey;
  g: number;
  factor: number;
}

function macroInfosFromGrams(macros: { protein: number; carbs: number; fat: number }): MacroInfo[] {
  return [
    { key: "proteinG", g: macros.protein, factor: KCAL_PER_G.protein },
    { key: "carbsG", g: macros.carbs, factor: KCAL_PER_G.carbs },
    { key: "fatG", g: macros.fat, factor: KCAL_PER_G.fat },
  ];
}

function applyDistribution(
  entries: MacroInfo[],
  targetKcal: number,
  setField: (key: MacroKey, value: string) => void,
): void {
  const oldKcal = entries.reduce((sum, entry) => sum + entry.g * entry.factor, 0);
  let distributedKcal = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) {
      continue;
    }

    const isLast = i === entries.length - 1;
    let newG: number;

    if (isLast) {
      newG = Math.round((targetKcal - distributedKcal) / entry.factor);
    } else {
      const ratio = oldKcal > 0 ? (entry.g * entry.factor) / oldKcal : 1 / entries.length;
      newG = Math.round((ratio * targetKcal) / entry.factor);
      distributedKcal += newG * entry.factor;
    }

    setField(entry.key, newG > 0 ? String(newG) : "");
  }
}

/** Scales protein/carbs/fat to match the new target kcal, preserving the current macro mix. */
export function redistributeMacrosForTargetKcal(
  newKcal: number,
  macros: { protein: number; carbs: number; fat: number },
  setField: (key: MacroKey, value: string) => void,
): void {
  if (newKcal <= 0) {
    return;
  }
  if (macros.protein === 0 && macros.carbs === 0 && macros.fat === 0) {
    return;
  }

  applyDistribution(macroInfosFromGrams(macros), newKcal, setField);
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Converts a unit input to grams. Returns `0` for empty or non-positive input (clears the field).
 * Returns `null` when the chosen unit needs weight or target kcal that is missing.
 */
export function gramsFromUnitValue(
  args: Readonly<{
    unit: MacroUnit;
    value: number;
    kcalPerGram: number;
    totalKcal: number;
    weightKg?: number;
  }>,
): number | null {
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

export function unitValueFromGrams(
  args: Readonly<{
    unit: MacroUnit;
    grams: number;
    kcalPerGram: number;
    totalKcal: number;
    weightKg?: number;
  }>,
): number {
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

/** Display string for the macro unit input (empty when grams are zero or unset). */
export function formatMacroUnitDisplay(
  args: Readonly<{
    unit: MacroUnit;
    grams: number;
    kcalPerGram: number;
    totalKcal: number;
    weightKg?: number;
  }>,
): string {
  if (args.grams <= 0) {
    return "";
  }
  return String(
    unitValueFromGrams({
      unit: args.unit,
      grams: args.grams,
      kcalPerGram: args.kcalPerGram,
      totalKcal: args.totalKcal,
      weightKg: args.weightKg,
    }),
  );
}

export function getMacroUnitSelectItems(): ReadonlyArray<{ value: MacroUnit; label: string }> {
  return [
    { value: "gkg", label: m.nutrition_macro_unit_g_per_kg() },
    { value: "percent", label: m.nutrition_macro_unit_pct_kcal() },
    { value: "grams", label: m.nutrition_macro_unit_grams() },
  ];
}

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

export function macroUnitsAllPreferred(
  weightKg: number | undefined,
  hasTargetKcal: boolean,
): Record<MacroKey, MacroUnit> {
  const u = pickPreferredMacroUnit(weightKg, hasTargetKcal);
  return { proteinG: u, carbsG: u, fatG: u };
}
