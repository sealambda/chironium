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

/** A failed mutation, with the input fields the server blamed (snake_case, e.g. `expires_at`). */
export class MutationError extends Error {
  readonly fields: string[];

  constructor(message: string, fields: string[]) {
    super(message);
    this.name = "MutationError";
    this.fields = fields;
  }
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

  throw new MutationError(errorMessage, payload?.errors?.flatMap((e) => e.fields ?? []) ?? []);
}
