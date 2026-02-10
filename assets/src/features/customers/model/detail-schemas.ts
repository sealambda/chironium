import { z } from "zod";

// ─── Body Metrics ───────────────────────────────────────────────────

export const bodyMetricsSchema = z.object({
  date: z.date({ required_error: "validation_required" }),
  weight: z.number({ required_error: "validation_required" }).positive("validation_positive"),
  heightCm: z.number({ required_error: "validation_required" }).positive("validation_positive"),
  chest: z.number().positive("validation_positive").optional(),
  waist: z.number().positive("validation_positive").optional(),
  hip: z.number().positive("validation_positive").optional(),
  biceps: z.number().positive("validation_positive").optional(),
  quadriceps: z.number().positive("validation_positive").optional(),
});

export type BodyMetricsFormData = z.infer<typeof bodyMetricsSchema>;

export const defaultBodyMetricsValues: BodyMetricsFormData = {
  date: new Date(),
  weight: 0,
  heightCm: 0,
  chest: undefined,
  waist: undefined,
  hip: undefined,
  biceps: undefined,
  quadriceps: undefined,
};

// ─── Nutrition Plan ─────────────────────────────────────────────────

export const nutritionPlanSchema = z.object({
  startDate: z.date({ required_error: "validation_required" }),
  endDate: z.date().optional(),
  kcal: z.number({ required_error: "validation_required" }).int().positive("validation_positive"),
  protein: z.number({ required_error: "validation_required" }).positive("validation_positive"),
  carbs: z.number({ required_error: "validation_required" }).positive("validation_positive"),
  fat: z.number({ required_error: "validation_required" }).positive("validation_positive"),
});

export type NutritionPlanFormData = z.infer<typeof nutritionPlanSchema>;

export const defaultNutritionPlanValues: NutritionPlanFormData = {
  startDate: new Date(),
  endDate: undefined,
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

// ─── Subscription ───────────────────────────────────────────────────

export const subscriptionFormSchema = z.object({
  planId: z.string().min(1, "validation_required"),
  startDate: z.date({ required_error: "validation_required" }),
});

export type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export const defaultSubscriptionValues: SubscriptionFormData = {
  planId: "",
  startDate: new Date(),
};

// ─── Pathology ──────────────────────────────────────────────────────

export const pathologyFormSchema = z
  .object({
    pathologyId: z.string().min(1, "validation_required"),
    pathologyName: z.string().min(1, "validation_required"),
    isChronic: z.boolean(),
    diagnosedDate: z.date().optional(),
    diagnosedDateUnknown: z.boolean(),
    resolvedDate: z.date().optional(),
    resolvedDateUnknown: z.boolean(),
    notes: z.string().optional(),
  })
  .refine((data) => data.diagnosedDate || data.diagnosedDateUnknown, {
    path: ["diagnosedDate"],
    message: "validation_required",
  });

export type PathologyFormData = z.infer<typeof pathologyFormSchema>;

export const defaultPathologyValues: PathologyFormData = {
  pathologyId: "",
  pathologyName: "",
  isChronic: false,
  diagnosedDate: new Date(),
  diagnosedDateUnknown: false,
  resolvedDate: undefined,
  resolvedDateUnknown: false,
  notes: "",
};

// ─── Cycle ──────────────────────────────────────────────────────────

export const cycleFormSchema = z.object({
  startDate: z.date({ required_error: "validation_required" }),
  endDate: z.date().optional(),
  cycleLength: z.number().int().positive("validation_positive").optional(),
  symptoms: z.array(z.string()).default([]),
});

export type CycleFormData = z.infer<typeof cycleFormSchema>;

export const defaultCycleValues: CycleFormData = {
  startDate: new Date(),
  endDate: undefined,
  cycleLength: undefined,
  symptoms: [],
};
