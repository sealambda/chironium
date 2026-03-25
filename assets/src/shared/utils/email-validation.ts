import { z } from "zod";

import * as m from "@/paraglide/messages";

/** Validates a required email address using the same Zod approach as onboarding. */
export const emailRequiredSchema = z.email({ message: m.validation_email_format() });

/**
 * Shared optional email schema (allows empty string), used by the customer onboarding form.
 * Keep this in sync with `emailRequiredSchema` to avoid duplicated validation rules.
 */
export const emailOptionalSchema = z.union([emailRequiredSchema, z.literal("")]);
