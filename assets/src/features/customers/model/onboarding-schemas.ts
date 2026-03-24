// Zod v4 schemas for onboarding form steps.
// TanStack Form v1 supports Standard Schema natively — pass schemas
// directly to `validators: { onSubmit: schema }` with no adapter.

import { z } from "zod";

import * as m from "@/paraglide/messages";

// Unicode-aware name pattern: letters, spaces, hyphens, apostrophes, dots.
// No consecutive specials, no leading/trailing specials (except trailing dot).
export const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*[\p{L}.]$/u;
export const CONSECUTIVE_SPECIALS = /[\s'.-]{2}/;

const nameField = z
  .string()
  .min(2, { message: m.validation_name_min() })
  .max(50, { message: m.validation_name_max() })
  .regex(NAME_PATTERN, { message: m.validation_name_format() })
  .refine((v) => !CONSECUTIVE_SPECIALS.test(v), { message: m.validation_name_consecutive() });

export const personSchema = z.object({
  givenName: nameField,
  familyName: nameField,
  birthDate: z.string(),
  gender: z.union([z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]), z.literal("")]),
  phone: z
    .string()
    .refine((v) => !v || /^\+\d{7,15}$/.test(v), { message: m.validation_phone_format() }),
  email: z.union([z.string().email({ message: m.validation_email_format() }), z.literal("")]),
  instagram: z.string(),
});

export type PersonSchemaData = z.infer<typeof personSchema>;

export const subscriptionSchema = z.object({
  planId: z.string().min(1, { message: m.validation_plan_required() }),
  startDate: z.string(),
});

export type SubscriptionSchemaData = z.infer<typeof subscriptionSchema>;

export const objectiveSchema = z.object({
  objective: z.string().min(1, { message: m.validation_objective_required() }),
});

export type ObjectiveSchemaData = z.infer<typeof objectiveSchema>;

export const menstrualCycleSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string(),
});

export type MenstrualCycleSchemaData = z.infer<typeof menstrualCycleSchema>;

export const anthropometrySchema = z.object({
  weightKg: z
    .number()
    .min(15, { message: m.validation_weight_range() })
    .max(650, { message: m.validation_weight_range() })
    .nullable()
    .default(null),
  heightCm: z
    .number()
    .min(50, { message: m.validation_height_range() })
    .max(300, { message: m.validation_height_range() })
    .nullable()
    .default(null),
  chestCm: z
    .number()
    .min(40, { message: m.validation_chest_range() })
    .max(300, { message: m.validation_chest_range() })
    .nullable()
    .default(null),
  waistCm: z
    .number()
    .min(30, { message: m.validation_waist_range() })
    .max(350, { message: m.validation_waist_range() })
    .nullable()
    .default(null),
  hipCm: z
    .number()
    .min(40, { message: m.validation_hip_range() })
    .max(300, { message: m.validation_hip_range() })
    .nullable()
    .default(null),
  armCm: z
    .number()
    .min(10, { message: m.validation_arm_range() })
    .max(100, { message: m.validation_arm_range() })
    .nullable()
    .default(null),
  thighCm: z
    .number()
    .min(15, { message: m.validation_thigh_range() })
    .max(150, { message: m.validation_thigh_range() })
    .nullable()
    .default(null),
});

export type AnthropometrySchemaData = z.infer<typeof anthropometrySchema>;

export const allergiesSchema = z.object({
  allergies: z.string().default(""),
  intolerances: z.string().default(""),
});

export type AllergiesSchemaData = z.infer<typeof allergiesSchema>;

export const foodSchema = z.object({
  included: z.array(z.string()).default([]),
  excluded: z.array(z.string()).default([]),
});

export type FoodSchemaData = z.infer<typeof foodSchema>;

export const noteSchema = z.object({
  title: z.string().default(""),
  body: z.string().default(""),
});

export type NoteSchemaData = z.infer<typeof noteSchema>;
