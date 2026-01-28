/**
 * Shared GraphQL helpers for API calls.
 */

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

interface GraphqlRequestOptions {
  apiBase: string;
  query: string;
  variables?: Record<string, unknown>;
  headers?: HeadersInit;
}

export async function postGraphql<T>({
  apiBase,
  query,
  variables,
  headers = {},
}: GraphqlRequestOptions): Promise<T> {
  const response = await fetch(`${apiBase}/gql`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const result: GraphqlResponse<T> = await response.json();

  if (result.errors?.length) {
    const message = result.errors
      .map((err) => err.message)
      .filter(Boolean)
      .join(" ");
    throw new Error(message || "GraphQL error");
  }

  if (!result.data) {
    throw new Error("Missing GraphQL data");
  }

  return result.data;
}
