import { type ReactNode, useCallback, useEffect, useState } from "react";
import { buildHeaders } from "./auth-utils";
import { type Organisation, OrgContext, type OrgContextState } from "./org-context";

interface OrgProviderProps {
  children: ReactNode;
}

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const ORG_PREFERENCE_KEY = "chironium_preferred_org_id";

function withAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    ...buildHeaders(),
    ...headers,
  };
}

function getStoredPreference(): string | null {
  try {
    return localStorage.getItem(ORG_PREFERENCE_KEY);
  } catch {
    return null;
  }
}

function storePreference(orgId: string | null): void {
  try {
    if (orgId) {
      localStorage.setItem(ORG_PREFERENCE_KEY, orgId);
    } else {
      localStorage.removeItem(ORG_PREFERENCE_KEY);
    }
  } catch {
    // localStorage not available.
  }
}

async function postGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}/gql`, {
    method: "POST",
    credentials: "include",
    headers: withAuthHeaders(),
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
 * Organisation provider component.
 * Manages accessible organisations and selected organisation state.
 */
export function OrgProvider({ children }: OrgProviderProps) {
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch accessible organisations from the API.
   */
  const fetchAvailableOrgs = useCallback(async (): Promise<Organisation[]> => {
    try {
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

      const data = await postGraphql<{ organisations: Organisation[] }>(query);
      const orgs = data.organisations.map(parseOrganisation);
      setAvailableOrgs(orgs);

      return orgs;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      return [];
    }
  }, []);

  /**
   * Fetch the preferred organisation from local storage.
   */
  const fetchPreference = useCallback(async () => {
    return getStoredPreference();
  }, []);

  /**
   * Persist the preferred organisation locally.
   */
  const setPreference = useCallback(async (orgId: string) => {
    storePreference(orgId);
  }, []);

  /**
   * Initialize organisations and preference on mount.
   */
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch accessible orgs.
        const orgs = await fetchAvailableOrgs();

        if (orgs.length === 0) {
          setSelectedOrg(null);
          return;
        }

        // Fetch preference from local storage.
        const preferredOrgId = await fetchPreference();

        if (preferredOrgId) {
          const org = orgs.find((o) => o.id === preferredOrgId);
          setSelectedOrg(org || null);
        } else {
          setSelectedOrg(null);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fetchAvailableOrgs, fetchPreference]);

  /**
   * Refresh accessible organisations.
   */
  const refreshOrgs = useCallback(async (): Promise<Organisation[]> => {
    setLoading(true);
    setError(null);

    try {
      const orgs = await fetchAvailableOrgs();

      // Re-fetch preference to ensure consistency.
      const preferredOrgId = await fetchPreference();
      if (preferredOrgId) {
        const org = orgs.find((o) => o.id === preferredOrgId);
        setSelectedOrg(org || null);
      } else {
        setSelectedOrg(null);
      }
      return orgs;
    } finally {
      setLoading(false);
    }
  }, [fetchAvailableOrgs, fetchPreference]);

  /**
   * Select an organisation and persist preference.
   */
  const selectOrg = useCallback(
    async (orgId: string) => {
      let org = availableOrgs.find((o) => o.id === orgId);
      if (!org) {
        const refreshedOrgs = await refreshOrgs();
        org = refreshedOrgs.find((o) => o.id === orgId);
      }
      if (!org) {
        throw new Error("Organisation not found");
      }

      // Optimistically update UI.
      setSelectedOrg(org);

      try {
        // Persist preference.
        await setPreference(orgId);
      } catch (err) {
        // Revert on error.
        const preferredOrgId = await fetchPreference();
        const revertOrg = availableOrgs.find((o) => o.id === preferredOrgId);
        setSelectedOrg(revertOrg || null);
        throw err;
      }
    },
    [availableOrgs, setPreference, fetchPreference, refreshOrgs],
  );

  /**
   * Create a new organisation.
   */
  const createOrg = useCallback(
    async (data: { name: string; slug: string }) => {
      try {
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
        }>(query, { input: { name: data.name, slug: data.slug } });

        const payload = result.createOrganisation;
        if (!payload?.result) {
          const errorMessage =
            payload?.errors
              ?.map((error) => error.message)
              .filter(Boolean)
              .join(" ") || "Failed to create organisation";
          throw new Error(errorMessage);
        }

        const newOrg: Organisation = parseOrganisation(payload.result);

        // Refresh org list to include the new org.
        await refreshOrgs();

        return newOrg;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        throw err;
      }
    },
    [refreshOrgs],
  );

  const value: OrgContextState = {
    selectedOrg,
    availableOrgs,
    loading,
    error,
    selectOrg,
    refreshOrgs,
    createOrg,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
