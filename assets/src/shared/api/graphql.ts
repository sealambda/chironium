import {
  ClientError,
  GraphQLClient,
  type RequestOptions,
  type Variables,
} from "graphql-request";
import { API_PATHS, AUTH_URLS } from "@/shared/utils/url-utils";
import { getAuthHeaders } from "./request";

/**
 * Shared GraphQL helpers for API calls.
 */

/**
 * Check if an error indicates an authentication failure.
 */
function isAuthError(error: ClientError): boolean {
  const status = error.response.status;
  if (status === 401) {
    return true;
  }

  const hasAuthError = error.response.errors?.some(
    (err: { message: string; extensions?: { code?: string } }) =>
      err.message.toLowerCase().includes("unauthorized") ||
      err.message.toLowerCase().includes("unauthenticated") ||
      err.extensions?.code === "UNAUTHENTICATED",
  );

  return hasAuthError ?? false;
}

export async function requestGraphql<TResult>({
  document,
  variables,
}: Pick<
  RequestOptions<Variables, TResult>,
  "document" | "variables"
>): Promise<TResult> {
  // GraphQLClient requires an absolute URL.
  // Use current origin since the PWA is always served through Phoenix.
  const endpoint = `${window.location.origin}${API_PATHS.graphql}`;
  const client = new GraphQLClient(endpoint, {
    credentials: "include",
    headers: getAuthHeaders(),
  });

  try {
    return await client.request({
      document,
      variables,
    });
  } catch (error) {
    if (error instanceof ClientError) {
      // Handle authentication errors by redirecting to sign-in.
      // Phoenix will handle the redirect back after re-authentication.
      if (isAuthError(error)) {
        window.location.href = AUTH_URLS.signIn;
        throw new Error("Session expired - redirecting to sign-in");
      }

      const message = error.response.errors
        ?.map((err) => err.message)
        .filter(Boolean)
        .join(" ");
      throw new Error(message || "GraphQL error");
    }

    throw error;
  }
}
