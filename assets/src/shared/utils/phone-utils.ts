/**
 * Phone number formatting utilities following E.164 and E.123 standards.
 * Uses libphonenumber-js for accurate worldwide formatting.
 */

import {
  AsYouType,
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
} from "libphonenumber-js";

/**
 * Map of calling codes to their primary country.
 * Used for early country detection when libphonenumber-js can't determine the country yet.
 * Only includes codes that map to a single primary country or have a clear default.
 */
const CALLING_CODE_TO_COUNTRY: Record<string, CountryCode> = (() => {
  const map: Record<string, CountryCode> = {};
  for (const country of getCountries()) {
    const code = getCountryCallingCode(country);
    // Only set if not already set (first country wins as primary).
    // This prioritizes countries that appear first alphabetically.
    if (!map[code]) {
      map[code] = country;
    }
  }
  // Override with preferred primary countries for shared codes.
  map["1"] = "US"; // NANP - default to US
  map["44"] = "GB"; // UK territories - default to GB
  map["7"] = "RU"; // Russia/Kazakhstan - default to Russia
  return map;
})();

/**
 * Validation status for real-time phone input feedback.
 */
export type PhoneValidationStatus =
  | "valid"
  | "invalid"
  | "incomplete"
  | "empty";

/**
 * Result of phone number analysis during input.
 */
export interface PhoneAnalysis {
  /** Detected country code (e.g., "ES", "US") */
  country: CountryCode | undefined;
  /** Country calling code (e.g., "34", "1") */
  callingCode: string | undefined;
  /** National number part (digits after country code) */
  nationalNumber: string;
  /** Full number in E.164 format */
  e164: string;
  /** Formatted display value in INTERNATIONAL format */
  formatted: string;
  /** Current validation status */
  status: PhoneValidationStatus;
  /** Whether more digits can be added */
  canAddMoreDigits: boolean;
}

/**
 * Format phone for display using E.123 international format.
 * Uses libphonenumber-js AsYouType for proper country code detection.
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";

  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  if (!digits) return hasPlus ? "+" : "";

  // Use AsYouType for progressive formatting with proper country code detection.
  const formatter = new AsYouType();
  const input = `+${digits}`;
  const formatted = formatter.input(input);

  return formatted || `+${digits}`;
}

/**
 * Get E.164 format for storage.
 * Validates and formats the phone number if valid.
 */
export function toE164(phone: string): string {
  const parsed = parsePhoneNumberFromString(phone);
  if (parsed?.isValid()) {
    return parsed.format("E.164");
  }
  // Fallback: return with + if has digits (for partial numbers while typing).
  const digits = phone.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

/**
 * Validate phone number meets E.164 requirements.
 * Uses libphonenumber-js for accurate validation.
 */
export function isValidE164(phone: string): boolean {
  const parsed = parsePhoneNumberFromString(phone);
  return parsed?.isValid() ?? false;
}

/**
 * Check if a string is empty or only contains formatting characters.
 */
export function isPhoneEmpty(phone: string): boolean {
  return !phone.replace(/\D/g, "");
}

/**
 * Analyze a phone number string and return detailed information.
 * Uses AsYouType for progressive analysis during input.
 */
export function analyzePhoneNumber(input: string): PhoneAnalysis {
  const digits = input.replace(/\D/g, "");

  if (!digits) {
    return {
      country: undefined,
      callingCode: undefined,
      nationalNumber: "",
      e164: "",
      formatted: input.startsWith("+") ? "+" : "",
      status: "empty",
      canAddMoreDigits: true,
    };
  }

  const normalized = `+${digits}`;
  const formatter = new AsYouType();
  const formatted = formatter.input(normalized);

  const phoneNumber = formatter.getNumber();
  const nationalNumber = formatter.getNationalNumber() || "";
  const callingCode = phoneNumber?.countryCallingCode;

  // Try multiple methods for country detection (earlier is better for UX).
  // 1. formatter.getCountry() - works earlier than getNumber()?.country.
  // 2. getNumber()?.country - more accurate once number is complete.
  // 3. Fallback to calling code map for codes like +44 that need full number.
  let country: CountryCode | undefined =
    formatter.getCountry() || phoneNumber?.country;

  // If still no country but we have a calling code pattern, use the map.
  if (!country && digits.length >= 1) {
    // Try to match calling codes (1-3 digits after the +).
    for (let len = Math.min(3, digits.length); len >= 1; len--) {
      const potentialCode = digits.slice(0, len);
      if (CALLING_CODE_TO_COUNTRY[potentialCode]) {
        country = CALLING_CODE_TO_COUNTRY[potentialCode];
        break;
      }
    }
  }

  // Check validation status.
  let status: PhoneValidationStatus = "incomplete";
  let canAddMoreDigits = true;

  if (country) {
    const lengthValidation = validatePhoneNumberLength(normalized);

    if (lengthValidation === undefined) {
      // Valid length - check if actually valid phone number.
      const parsed = parsePhoneNumberFromString(normalized);
      status = parsed?.isValid() ? "valid" : "incomplete";

      // Check if adding one more digit would make it too long.
      // Only TOO_LONG stops input - INVALID_LENGTH means there might be valid lengths after.
      const withOneMore = `${normalized}0`;
      const nextLengthValidation = validatePhoneNumberLength(withOneMore);
      canAddMoreDigits = nextLengthValidation !== "TOO_LONG";
    } else if (lengthValidation === "TOO_LONG") {
      status = "invalid";
      canAddMoreDigits = false;
    } else if (lengthValidation === "TOO_SHORT") {
      status = "incomplete";
      canAddMoreDigits = true;
    } else if (lengthValidation === "INVALID_LENGTH") {
      // Invalid length but not too long - could be between valid lengths (like UK).
      status = "invalid";
      // Check if adding one more digit would make it too long.
      const withOneMore = `${normalized}0`;
      const nextLengthValidation = validatePhoneNumberLength(withOneMore);
      canAddMoreDigits = nextLengthValidation !== "TOO_LONG";
    } else {
      status = "incomplete";
      canAddMoreDigits = true;
    }
  } else {
    // No country detected yet - could be still typing country code OR number is too long.
    // Check length validation to catch TOO_LONG even without country detection.
    const lengthValidation = validatePhoneNumberLength(normalized);

    if (lengthValidation === "TOO_LONG") {
      status = "invalid";
      canAddMoreDigits = false;
    } else {
      status = "incomplete";
      // Also check if adding one more would make it too long.
      const withOneMore = `${normalized}0`;
      const nextLengthValidation = validatePhoneNumberLength(withOneMore);
      canAddMoreDigits = nextLengthValidation !== "TOO_LONG";
    }
  }

  return {
    country,
    callingCode,
    nationalNumber,
    e164: phoneNumber?.number || normalized,
    formatted: formatted || normalized,
    status,
    canAddMoreDigits,
  };
}

/**
 * Truncate a phone number to the maximum valid length for its detected country.
 * Used when pasting numbers that are too long.
 */
export function truncateToValidLength(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return input.startsWith("+") ? "+" : "";

  const normalized = `+${digits}`;
  const analysis = analyzePhoneNumber(normalized);

  // If already valid or incomplete, no truncation needed.
  if (analysis.status !== "invalid" || analysis.canAddMoreDigits) {
    return normalized;
  }

  // Remove digits from the end until valid or incomplete.
  for (let len = digits.length - 1; len >= 1; len--) {
    const candidate = `+${digits.slice(0, len)}`;
    const candidateAnalysis = analyzePhoneNumber(candidate);

    if (
      candidateAnalysis.status !== "invalid" ||
      candidateAnalysis.canAddMoreDigits
    ) {
      return candidate;
    }
  }

  return `+${digits.slice(0, 1)}`;
}

/**
 * Sanitize input and enforce digit limits based on detected country.
 * Returns the sanitized value and whether it was truncated.
 */
export function sanitizePhoneInput(
  rawInput: string,
  previousValue: string,
): { value: string; truncated: boolean } {
  // Remove all non-digit characters except leading +.
  let sanitized = rawInput.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  const digits = sanitized.replace(/\D/g, "");

  // Auto-add + prefix.
  if (digits.length > 0 && !sanitized.startsWith("+")) {
    sanitized = `+${digits}`;
  }

  // If no digits, return early.
  if (!digits) {
    return { value: sanitized, truncated: false };
  }

  // Analyze the number to check if we can add more digits.
  const analysis = analyzePhoneNumber(sanitized);
  const prevDigits = previousValue.replace(/\D/g, "");

  // If it's too long (invalid and can't add more), truncate.
  if (!analysis.canAddMoreDigits && analysis.status === "invalid") {
    // If we're adding digits (not deleting), truncate to valid length.
    if (digits.length > prevDigits.length) {
      const truncated = truncateToValidLength(sanitized);
      return { value: truncated, truncated: true };
    }
  }

  return { value: sanitized, truncated: false };
}
