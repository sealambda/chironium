/**
 * Utilities for handling GraphQL mutation errors.
 */

interface GraphQLError {
  message?: string | null;
  fields?: string[] | null;
}

interface MutationPayload<T> {
  result?: T | null;
  errors?: GraphQLError[] | null;
}

/**
 * Extract and throw error from mutation payload if result is missing.
 * Returns the result if successful.
 */
export function unwrapMutationResult<T>(
  payload: MutationPayload<T> | null | undefined,
  fallbackMessage: string,
): T {
  if (payload?.result) {
    return payload.result;
  }

  const errorMessage =
    payload?.errors
      ?.map((e) => e.message)
      .filter(Boolean)
      .join(" ") || fallbackMessage;

  throw new Error(errorMessage);
}
