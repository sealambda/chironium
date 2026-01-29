import type { z } from "zod";

/**
 * Form utility functions for TanStack Form error handling.
 */

/**
 * Create a field-level validator from a Zod schema.
 * Returns undefined if valid, or the first error message if invalid.
 * Use this for TanStack Form's validators.onBlur.
 */
export function createFieldValidator<T>(schema: z.ZodSchema<T>) {
  return ({ value }: { value: T }) => {
    const result = schema.safeParse(value);
    return result.success ? undefined : result.error.issues[0]?.message;
  };
}

/**
 * Extract error message from TanStack Form validation error.
 * Handles both string errors and ZodIssue-like objects.
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    // ZodIssue has .message property.
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  // Fallback - shouldn't happen with proper Zod integration.
  return "Validation error";
}

/**
 * Map TanStack Form errors to FieldError format.
 * Use this instead of inline mapping to properly extract error messages.
 */
export function mapFieldErrors(errors: unknown[]): Array<{ message: string }> {
  return errors.map((e) => ({
    message: extractErrorMessage(e),
  }));
}
