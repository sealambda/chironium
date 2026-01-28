import {
  ClientError,
  GraphQLClient,
  type RequestOptions,
  type Variables,
} from "graphql-request";
import { getApiBase, getAuthHeaders } from "./request";

/**
 * Shared GraphQL helpers for API calls.
 */

const API_BASE = getApiBase();

export async function requestGraphql<TResult>({
  document,
  variables,
}: Pick<
  RequestOptions<Variables, TResult>,
  "document" | "variables"
>): Promise<TResult> {
  const client = new GraphQLClient(`${API_BASE}/gql`, {
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
      const message = error.response.errors
        ?.map((err) => err.message)
        .filter(Boolean)
        .join(" ");
      throw new Error(message || "GraphQL error");
    }

    throw error;
  }
}
