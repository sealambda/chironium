import { Beef, Droplets, type LucideIcon, Wheat } from "lucide-react";

import * as m from "@/paraglide/messages";

import { KCAL_PER_G, type MacroGrams, type MacroId, type MacroKey } from "./nutrition-plan-utils";

/**
 * Single source of truth for how each macronutrient is presented: colour,
 * icon, label, the form field it maps to, and its Atwater energy density.
 * Shared by the donut, the card legend, the activity-feed event, and the
 * dialog so protein/carbs/fat read consistently everywhere.
 */
export interface MacroMeta {
  readonly id: MacroId;
  /** The string form field this macro edits. */
  readonly fieldKey: MacroKey;
  readonly label: () => string;
  readonly icon: LucideIcon;
  /** Donut arc stroke colour. */
  readonly arcClass: string;
  /** Icon / accent text colour (light + dark). */
  readonly iconClass: string;
  /** Solid swatch colour for legend dots. */
  readonly dotClass: string;
  readonly kcalPerGram: number;
}

export const MACRO_META: Record<MacroId, MacroMeta> = {
  protein: {
    id: "protein",
    fieldKey: "proteinG",
    label: m.nutrition_field_protein,
    icon: Beef,
    arcClass: "stroke-red-500",
    iconClass: "text-red-600 dark:text-red-400",
    dotClass: "bg-red-500",
    kcalPerGram: KCAL_PER_G.protein,
  },
  carbs: {
    id: "carbs",
    fieldKey: "carbsG",
    label: m.nutrition_field_carbs,
    icon: Wheat,
    arcClass: "stroke-amber-500",
    iconClass: "text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
    kcalPerGram: KCAL_PER_G.carbs,
  },
  fat: {
    id: "fat",
    fieldKey: "fatG",
    label: m.nutrition_field_fat,
    icon: Droplets,
    arcClass: "stroke-violet-500",
    iconClass: "text-violet-600 dark:text-violet-400",
    dotClass: "bg-violet-500",
    kcalPerGram: KCAL_PER_G.fat,
  },
};

/** The three macro amounts (grams) of a plan, keyed by nutrient id. */
export function gramsByMacro(plan: {
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
}): MacroGrams {
  return { protein: plan.proteinG, carbs: plan.carbsG, fat: plan.fatG };
}
