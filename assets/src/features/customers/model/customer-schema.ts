import { addMonths } from "date-fns";
import { z } from "zod";
import type { Customer } from "../ui/customer-card";

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
const CONSECUTIVE_SPECIAL_PATTERN = /[.''-]{2,}/;
const CONSECUTIVE_SPECIAL_ERROR =
  "Consecutive special characters are not allowed";

export const givenNameSchema = z
  .string()
  .min(1, "Given name is required")
  .max(50, "Given name must be 50 characters or less")
  .regex(NAME_PATTERN, NAME_PATTERN_ERROR)
  .refine(
    (val) => !CONSECUTIVE_SPECIAL_PATTERN.test(val),
    CONSECUTIVE_SPECIAL_ERROR,
  );

export const stSurnameSchema = z
  .string()
  .min(1, "First surname is required")
  .max(50, "First surname must be 50 characters or less")
  .regex(NAME_PATTERN, NAME_PATTERN_ERROR)
  .refine(
    (val) => !CONSECUTIVE_SPECIAL_PATTERN.test(val),
    CONSECUTIVE_SPECIAL_ERROR,
  );

export const ndSurnameSchema = z
  .string()
  .max(50, "Second surname must be 50 characters or less")
  .regex(NAME_PATTERN, NAME_PATTERN_ERROR)
  .refine(
    (val) => !CONSECUTIVE_SPECIAL_PATTERN.test(val),
    CONSECUTIVE_SPECIAL_ERROR,
  )
  .optional()
  .or(z.literal(""));

export const emailSchema = z
  .email("Please enter a valid email address")
  .optional()
  .or(z.literal(""));

export const phoneSchema = z
  .string()
  .refine((val) => {
    if (!val) return true;
    const digits = val.replace(/\D/g, "");
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
      .replace(/^@/, "")
      .replace(/[^a-z0-9_.]/g, "");
    return clean ? `@${clean}` : "";
  })
  .refine(
    (val) => val === "" || /^@[a-z0-9_.]{1,30}$/.test(val),
    "Username must be 1-30 characters (letters, numbers, periods, underscores)",
  )
  .optional()
  .or(z.literal(""));

export const startDateSchema = z.date({ message: "Start date is required" });

export const planDurationSchema = z
  .number()
  .refine(
    (val) => [3, 6, 12].includes(val),
    "Plan duration must be 3, 6, or 12 months",
  );

// ============================================
// Full Form Schema (for submit validation)
// ============================================

/**
 * Zod schema for customer form validation.
 * Follows TanStack Form + Zod best practices from basecn.dev docs.
 */
export const customerFormSchema = z.object({
  givenName: z
    .string()
    .min(1, "Given name is required")
    .max(50, "Given name must be 50 characters or less")
    .regex(NAME_PATTERN, NAME_PATTERN_ERROR)
    .refine(
      (val) => !CONSECUTIVE_SPECIAL_PATTERN.test(val),
      CONSECUTIVE_SPECIAL_ERROR,
    ),
  stSurname: z
    .string()
    .min(1, "First surname is required")
    .max(50, "First surname must be 50 characters or less")
    .regex(NAME_PATTERN, NAME_PATTERN_ERROR)
    .refine(
      (val) => !CONSECUTIVE_SPECIAL_PATTERN.test(val),
      CONSECUTIVE_SPECIAL_ERROR,
    ),
  ndSurname: z
    .string()
    .max(50, "Second surname must be 50 characters or less")
    .regex(NAME_PATTERN, NAME_PATTERN_ERROR)
    .refine(
      (val) => !CONSECUTIVE_SPECIAL_PATTERN.test(val),
      CONSECUTIVE_SPECIAL_ERROR,
    )
    .optional()
    .or(z.literal("")),
  contact: z.object({
    email: z
      .email("Please enter a valid email address")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .refine((val) => {
        if (!val) return true;
        const digits = val.replace(/\D/g, "");
        return digits.length >= 7; // Max is prevented by input mask.
      }, "Phone number must be at least 7 digits")
      .optional()
      .or(z.literal("")),
    instagram: z
      .string()
      .transform((val) => {
        if (!val) return "";
        const clean = val
          .toLowerCase()
          .replace(/^@/, "")
          .replace(/[^a-z0-9_.]/g, "");
        return clean ? `@${clean}` : "";
      })
      .refine(
        (val) => val === "" || /^@[a-z0-9_.]{1,30}$/.test(val),
        "Username must be 1-30 characters (letters, numbers, periods, underscores)",
      )
      .optional()
      .or(z.literal("")),
  }),
  membership: z.object({
    startDate: z.date({
      message: "Start date is required",
    }),
    planDurationMonths: z
      .number()
      .refine(
        (val) => [3, 6, 12].includes(val),
        "Plan duration must be 3, 6, or 12 months",
      ),
  }),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

/**
 * Transform form data to Customer interface for storage.
 * Generates id, name, initials, status, and calculated endDate.
 */
export function formDataToCustomer(
  data: CustomerFormData,
  existingId?: string,
): Customer {
  const { givenName, stSurname, ndSurname } = data;
  const { startDate, planDurationMonths } = data.membership;
  const endDate = addMonths(startDate, planDurationMonths);

  const fullName = [givenName, stSurname, ndSurname].filter(Boolean).join(" ");
  const initials = `${givenName[0] || ""}${stSurname[0] || ""}`.toUpperCase();

  return {
    id: existingId ?? `local-${crypto.randomUUID()}`,
    name: fullName,
    initials,
    status: "up-to-date", // New customers start as up-to-date.
    membership: {
      startDate,
      planDurationMonths,
      endDate,
    },
    contact: {
      email: data.contact.email || undefined,
      phone: data.contact.phone || undefined,
      instagram: data.contact.instagram || undefined,
    },
    nameParts: {
      givenName,
      stSurname,
      ndSurname: ndSurname || undefined,
    },
  };
}

/**
 * Transform Customer back to form data for editing.
 * Falls back to parsing name string if nameParts are not available.
 */
export function customerToFormData(customer: Customer): CustomerFormData {
  // Use stored name parts if available, otherwise try to parse from name.
  let givenName = "";
  let stSurname = "";
  let ndSurname = "";

  if (customer.nameParts) {
    givenName = customer.nameParts.givenName;
    stSurname = customer.nameParts.stSurname;
    ndSurname = customer.nameParts.ndSurname || "";
  } else {
    // Fallback: split by spaces (lossy for complex names).
    const parts = customer.name.split(" ");
    givenName = parts[0] || "";
    stSurname = parts[1] || "";
    ndSurname = parts.slice(2).join(" ");
  }

  return {
    givenName,
    stSurname,
    ndSurname,
    contact: {
      email: customer.contact.email || "",
      phone: customer.contact.phone || "",
      instagram: customer.contact.instagram || "",
    },
    membership: {
      startDate: customer.membership.startDate,
      planDurationMonths: customer.membership.planDurationMonths,
    },
  };
}

/**
 * Default form values for new customer creation.
 */
export const defaultCustomerFormValues: CustomerFormData = {
  givenName: "",
  stSurname: "",
  ndSurname: "",
  contact: {
    email: "",
    phone: "",
    instagram: "",
  },
  membership: {
    startDate: new Date(),
    planDurationMonths: 3,
  },
};
