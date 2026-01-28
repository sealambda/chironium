import { postGraphql } from "@/shared/api/graphql";
import { getApiBase, getAuthHeaders } from "@/shared/api/request";
import type { Organisation } from "../types";

const API_BASE = getApiBase();

function parseOrganisation(resource: {
  id: string;
  name: string;
  slug: string;
  profilePicture: string | null;
  themeSeedColor: string | null;
}): Organisation {
  return {
    id: resource.id,
    name: resource.name,
    slug: resource.slug,
    profilePicture: resource.profilePicture,
    themeSeedColor: resource.themeSeedColor,
  };
}

/**
 * Fetch accessible organisations from the API.
 */
export async function fetchAccessibleOrganisations(): Promise<Organisation[]> {
  const query = `
    query AccessibleOrganisations {
      organisations {
        id
        name
        slug
        profilePicture
        themeSeedColor
      }
    }
  `;

  const data = await postGraphql<{ organisations: Organisation[] }>({
    apiBase: API_BASE,
    query,
    headers: getAuthHeaders(),
  });
  return data.organisations.map(parseOrganisation);
}

/**
 * Create a new organisation via API.
 */
export async function createOrganisation(data: {
  name: string;
  slug: string;
}): Promise<Organisation> {
  const query = `
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
  `;

  const result = await postGraphql<{
    createOrganisation: {
      result: Organisation | null;
      errors: { message?: string }[] | null;
    };
  }>({
    apiBase: API_BASE,
    query,
    variables: { input: { name: data.name, slug: data.slug } },
    headers: getAuthHeaders(),
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

  return parseOrganisation(payload.result);
}
