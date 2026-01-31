import {
  ClientError,
  GraphQLClient,
  type RequestOptions,
  type Variables,
} from "graphql-request";
import { getAuthHeaders } from "./request";
import { BACKEND_URL } from "@/shared/utils/auth-utils";

/**
 * Shared GraphQL helpers for API calls.
 */

export async function requestGraphql<TResult>({
  document,
  variables,
  organizationId,
}: Pick<
  RequestOptions<Variables, TResult>,
  "document" | "variables" | "requestHeaders"
> & { organizationId?: string }): Promise<TResult> {
  const client = new GraphQLClient(`${BACKEND_URL}/gql`, {
    credentials: "include",
    headers: getAuthHeaders({
      ...(organizationId
        ? { "x-chironium-organizationid": `org_${organizationId}` }
        : {}),
    }),
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
