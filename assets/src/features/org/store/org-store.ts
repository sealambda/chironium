import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { queryClient } from "@/app/providers/query-client";
import type { Organization } from "@/gql/graphql";
import {
  createOrganization,
  fetchAccessibleOrganizations,
} from "../api/org-api";
import { getStoredPreference, storePreference } from "../model/org-preferences";

export const ORG_QUERY_KEY = ["orgs", "accessible"] as const;

type OrgStoreState = {
  selectedOrg: Organization | null;
  availableOrgs: Organization[];
  loading: boolean;
  error: Error | null;
  setFromQuery: (payload: {
    availableOrgs: Organization[];
    loading: boolean;
    error: Error | null;
  }) => void;
  selectOrg: (orgId: string) => Promise<void>;
  refreshOrgs: () => Promise<Organization[]>;
  createOrg: (data: { name: string; slug: string }) => Promise<Organization>;
};

function resolveSelectedOrg(
  current: Organization | null,
  availableOrgs: Organization[],
): Organization | null {
  if (availableOrgs.length === 0) {
    return null;
  }

  if (current && availableOrgs.some((org) => org.id === current.id)) {
    return current;
  }

  const preferredOrgId = getStoredPreference();
  if (preferredOrgId) {
    const preferred = availableOrgs.find((org) => org.id === preferredOrgId);
    if (preferred) return preferred;
  }

  // Default to first org alphabetically
  const sorted = [...availableOrgs].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return sorted[0] ?? null;
}

export const useOrgStore = create<OrgStoreState>()(
  devtools(
    (set, get) => ({
      selectedOrg: null,
      availableOrgs: [],
      loading: true,
      error: null,
      setFromQuery: ({ availableOrgs, loading, error }) => {
        set(
          (state) => ({
            availableOrgs,
            loading,
            error,
            selectedOrg: resolveSelectedOrg(state.selectedOrg, availableOrgs),
          }),
          false,
          "orgs/sync",
        );
      },
      selectOrg: async (orgId: string) => {
        set({ error: null }, false, "orgs/selectOrg:start");
        let availableOrgs = get().availableOrgs;
        let org =
          availableOrgs.find((candidate) => candidate.id === orgId) ?? null;

        if (!org) {
          const refreshed = await queryClient.fetchQuery({
            queryKey: ORG_QUERY_KEY,
            queryFn: fetchAccessibleOrganizations,
          });
          availableOrgs = refreshed ?? [];
          org =
            availableOrgs.find((candidate) => candidate.id === orgId) ?? null;
          set(
            {
              availableOrgs,
              selectedOrg: resolveSelectedOrg(get().selectedOrg, availableOrgs),
            },
            false,
            "orgs/selectOrg:refresh",
          );
        }

        if (!org) {
          const error = new Error("Organization not found");
          set({ error }, false, "orgs/selectOrg:error");
          throw error;
        }

        storePreference(orgId);
        set({ selectedOrg: org }, false, "orgs/selectOrg:success");
      },
      refreshOrgs: async () => {
        set({ error: null }, false, "orgs/refresh:start");
        const refreshed = await queryClient.fetchQuery({
          queryKey: ORG_QUERY_KEY,
          queryFn: fetchAccessibleOrganizations,
        });
        const availableOrgs = refreshed ?? [];
        set(
          (state) => ({
            availableOrgs,
            selectedOrg: resolveSelectedOrg(state.selectedOrg, availableOrgs),
          }),
          false,
          "orgs/refresh:success",
        );
        return availableOrgs;
      },
      createOrg: async (data: { name: string; slug: string }) => {
        set({ error: null }, false, "orgs/create:start");
        const organization = await createOrganization(data);
        await queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY });
        return organization;
      },
    }),
    { name: "OrgStore", enabled: import.meta.env.DEV },
  ),
);
