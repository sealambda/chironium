import { requestGraphql } from "@/shared/api/graphql";
import { type Organisation } from "@/gql/graphql";
import { graphql } from "@/gql";

const AccessibleOrganisationsQuery = graphql(`
  query AccessibleOrganisations {
    organisations {
      id
      name
      slug
      profilePicture
      themeSeedColor
    }
  }
`);

const CreateOrganisationMutation = graphql(`
  mutation CreateOrganisation($input: CreateOrganisationInput!) {
    createOrganisation(input: $input) {
      result {
        id
        name
        slug
        profilePicture
        themeSeedColor
      }
      errors {
        message
      }
    }
  }
`);

/**
 * Fetch accessible organisations from the API.
 */
export async function fetchAccessibleOrganisations(): Promise<Organisation[]> {
  const data = await requestGraphql({
    document: AccessibleOrganisationsQuery,
  });
  return data.organisations;
}

/**
 * Create a new organisation via API.
 */
export async function createOrganisation(data: {
  name: string;
  slug: string;
}): Promise<Organisation> {
  const result = await requestGraphql({
    document: CreateOrganisationMutation,
    variables: { input: { name: data.name, slug: data.slug } },
  });

  const payload = result.createOrganisation;
  if (!payload?.result) {
    const errorMessage =
      payload?.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join(" ") || "Failed to create organisation";
    throw new Error(errorMessage);
  }

  return payload.result;
}
