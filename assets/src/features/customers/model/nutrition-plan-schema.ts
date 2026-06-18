// Zod v4 schema for the nutrition-plan dialog. TanStack Form v1 consumes this
// directly via `validators: { onSubmit }`. Form values are strings (raw input);
// validation rejects anything that is not a positive whole number — without
// coercion, so "1e3", "12.5", or " " never slip through as a valid integer.
//
// Macro↔kcal balance is deliberately NOT enforced here: it is surfaced as a
// soft warning with a one-click auto-balance, so the clinician is never blocked
// from saving a plan they intend.

import { z } from "zod";

import * as m from "@/paraglide/messages";

const positiveIntegerString = z
  .string()
  .trim()
  .refine((value) => value.length > 0, {
    message: m.validation_positive_number(),
  })
  .refine(
    (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0;
    },
    { message: m.validation_positive_number() },
  );

export const nutritionPlanFormSchema = z.object({
  targetKcal: positiveIntegerString,
  proteinG: positiveIntegerString,
  carbsG: positiveIntegerString,
  fatG: positiveIntegerString,
});

export type NutritionPlanFormValues = z.infer<typeof nutritionPlanFormSchema>;
