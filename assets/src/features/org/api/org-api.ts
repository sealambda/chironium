import { graphql } from "@/gql";
import type { Organization } from "@/gql/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

const ListOrganizationsQuery = graphql(`
  query ListOrganizations($first: Int) {
    listOrganizations(first: $first) {
      results {
        id
        name
        slug
      }
    }
  }
`);

const CreateOrganizationMutation = graphql(`
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      result {
        id
        name
        slug
      }
      errors {
        message
      }
    }
  }
`);

/**
 * Fetch accessible organizations from the API.
 */
export async function fetchAccessibleOrganizations(): Promise<Organization[]> {
  const data = await requestGraphql({
    document: ListOrganizationsQuery,
    variables: { first: 10 },
  });
  return data.listOrganizations?.results ?? [];
}

/**
 * Create a new organization via API.
 */
export async function createOrganization(data: {
  name: string;
  slug: string;
}): Promise<Organization> {
  const result = await requestGraphql({
    document: CreateOrganizationMutation,
    variables: { input: { name: data.name, slug: data.slug } },
  });

  return unwrapMutationResult(
    result.createOrganization,
    "Failed to create organization",
  );
}
