// Shared mutation error type (matches GraphQL convention)

export interface MutationError {
  message: string;
  fields?: string[] | null;
}
