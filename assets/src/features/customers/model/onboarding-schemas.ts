// Zod v4 schemas for onboarding form steps.
// TanStack Form v1 supports Standard Schema natively — pass schemas
// directly to `validators: { onSubmit: schema }` with no adapter.

import { z } from "zod";

import * as m from "@/paraglide/messages";
import { emailOptionalSchema } from "@/shared/utils/email-validation";

// Unicode-aware name pattern: letters, spaces, hyphens, apostrophes, dots.
// No consecutive specials, no leading/trailing specials (except trailing dot).
const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*[\p{L}.]$/u;
const CONSECUTIVE_SPECIALS = /[\s'.-]{2}/;

function createPersonNameField(msgs: {
  min: string;
  max: string;
  format: string;
  consecutive: string;
}) {
  return z
    .string()
    .min(2, { message: msgs.min })
    .max(50, { message: msgs.max })
    .regex(NAME_PATTERN, { message: msgs.format })
    .refine((v) => !CONSECUTIVE_SPECIALS.test(v), {
      message: msgs.consecutive,
    });
}

export const personGivenNameField = createPersonNameField({
  min: m.validation_given_name_min(),
  max: m.validation_given_name_max(),
  format: m.validation_given_name_format(),
  consecutive: m.validation_given_name_consecutive(),
});

export const personFamilyNameField = createPersonNameField({
  min: m.validation_family_name_min(),
  max: m.validation_family_name_max(),
  format: m.validation_family_name_format(),
  consecutive: m.validation_family_name_consecutive(),
});

export const personSchema = z.object({
  givenName: personGivenNameField,
  familyName: personFamilyNameField,
  birthDate: z.string(),
  gender: z.union([z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]), z.literal("")]),
  phone: z.string().refine((v) => !v || /^\+\d{7,15}$/.test(v), {
    message: m.validation_phone_format(),
  }),
  email: emailOptionalSchema,
  instagram: z.string(),
});

export const subscriptionSchema = z.object({
  planId: z.string(),
  startDate: z.string(),
});

export const objectiveSchema = z.object({
  objective: z.string(),
});
