import { graphql } from "msw";
import { API_PATHS } from "@/shared/utils/url-utils";

// GraphQL link for the endpoint
export const gql = graphql.link(API_PATHS.graphql);

// Extract organization ID from request header
export function extractOrgId(request: Request): string | null {
  const header = request.headers.get("x-chironium-organizationid");
  return header?.startsWith("org_") ? header.slice(4) : header;
}
