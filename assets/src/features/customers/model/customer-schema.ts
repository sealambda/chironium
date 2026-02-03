import { addMonths } from "date-fns";
import { z } from "zod";
import type { Customer } from "./customer-types";

// ============================================
// Individual Field Schemas (for field-level validation)
// ============================================

/**
 * Valid name pattern:
 * - Unicode letters (\p{L}) - handles accented characters like á, é, ñ, ü, ç.
 * - Spaces - for compound names like "María José".
 * - Hyphens - for names like "García-López", "Jean-Pierre".
 * - Apostrophes - for names like "O'Sullivan", "D'Angelo".
 * - Periods - for "Jr.", "Sr.".
 */
const NAME_PATTERN = /^[\p{L}\s'.-]*$/u;
const NAME_PATTERN_ERROR =
  "Only letters, spaces, hyphens, apostrophes, and periods are allowed";

/**
 * Detects any consecutive special characters like "..", ".-", "'-", etc.
 * These are not valid in names (e.g., "Jr......" or "O'-Sullivan")
 */
const CONSECUTIVE_SPECIAL_PATTERN = /[.'-]{2,}/;
const CONSECUTIVE_SPECIAL_ERROR =
  "Consecutive special characters are not allowed";

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(120, "Name must be 120 characters or less")
  .regex(NAME_PATTERN, NAME_PATTERN_ERROR)
  .refine(
    (val) => !CONSECUTIVE_SPECIAL_PATTERN.test(val),
    CONSECUTIVE_SPECIAL_ERROR,
  );

export const emailSchema = z
  .email("Please enter a valid email address")
  .optional()
  .or(z.literal(""));

export const phoneSchema = z
  .string()
  .refine((val) => {
    if (!val) return true;
    const digits = val.replaceAll(/\D/g, "");
    return digits.length >= 7;
  }, "Phone number must be at least 7 digits")
  .optional()
  .or(z.literal(""));

export const instagramSchema = z
  .string()
  .transform((val) => {
    if (!val) return "";
    const clean = val
      .toLowerCase()
      .replaceAll(/^@/g, "")
      .replaceAll(/[^a-z0-9_.]/g, "");
    return clean ? `@${clean}` : "";
  })
  .refine(
    (val) => val === "" || /^@[a-z0-9_.]{1,30}$/.test(val),
    "Username must be 1-30 characters (letters, numbers, periods, underscores)",
  )
  .optional()
  .or(z.literal(""));

export const startDateSchema = z.date({ message: "Start date is required" });

export const planIdSchema = z.string().min(1, "Plan is required");

/**
 * Get plan duration in months from plan ID.
 * Hardcoded mapping for now - will be replaced when plans are in DB.
 */
export function getPlanDuration(planId: string): number {
  const planMap: Record<string, number> = {
    "plan-3m": 3,
    "plan-6m": 6,
    "plan-12m": 12,
  };
  return planMap[planId] ?? 3; // Default to 3 months if unknown
}

/**
 * Get plan ID from duration in months.
 * Hardcoded reverse mapping for now - will be replaced when plans are in DB.
 */
export function getPlanIdFromDuration(durationMonths: number): string {
  const durationMap: Record<number, string> = {
    3: "plan-3m",
    6: "plan-6m",
    12: "plan-12m",
  };
  return durationMap[durationMonths] ?? "plan-3m"; // Default to 3 month plan
}

// ============================================
// Full Form Schema (for submit validation)
// ============================================

/**
 * Zod schema for customer form validation.
 * Composed from individual field schemas to avoid duplication.
 * Follows TanStack Form + Zod best practices from basecn.dev docs.
 */
export const customerFormSchema = z.object({
  name: nameSchema,
  contact: z.object({
    email: emailSchema,
    phone: phoneSchema,
    instagram: instagramSchema,
  }),
  subscription: z.object({
    startDate: startDateSchema,
    planId: planIdSchema,
  }),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

/**
 * Transform form data to Customer interface for storage.
 * Generates id, name, initials, status, and calculated endDate.
 * Derives plan duration from the selected plan ID.
 */
export function formDataToCustomer(
  data: CustomerFormData,
  existingId?: string,
): Customer {
  const { name } = data;
  const { startDate, planId } = data.subscription;
  const planDurationMonths = getPlanDuration(planId);
  const endDate = addMonths(startDate, planDurationMonths);

  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  const firstInitial = nameParts.at(0)?.[0] || "";
  const lastInitial = nameParts.at(-1)?.[0] || "";
  const initials =
    `${firstInitial}${lastInitial || firstInitial}`.toUpperCase() || "?";

  return {
    id: existingId ?? `local-${crypto.randomUUID()}`,
    name,
    initials,
    status: "up-to-date", // New customers start up to date.
    subscription: {
      startDate,
      planDurationMonths,
      endDate,
    },
    contact: {
      email: data.contact.email || undefined,
      phone: data.contact.phone || undefined,
      instagram: data.contact.instagram || undefined,
    },
  };
}

/**
 * Transform Customer back to form data for editing.
 * Derives plan ID from the stored plan duration.
 */
export function customerToFormData(customer: Customer): CustomerFormData {
  return {
    name: customer.name,
    contact: {
      email: customer.contact.email || "",
      phone: customer.contact.phone || "",
      instagram: customer.contact.instagram || "",
    },
    subscription: {
      startDate: customer.subscription.startDate,
      planId: getPlanIdFromDuration(customer.subscription.planDurationMonths),
    },
  };
}

/**
 * Default form values for new customer creation.
 */
export const defaultCustomerFormValues: CustomerFormData = {
  name: "",
  contact: {
    email: "",
    phone: "",
    instagram: "",
  },
  subscription: {
    startDate: new Date(),
    planId: "",
  },
};
