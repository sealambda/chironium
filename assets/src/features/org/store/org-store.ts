import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { queryClient } from "@/app/providers/query-client";
import { createOrganization, fetchAccessibleOrganizations } from "@/features/org/api/org-api";
import { getStoredPreference, storePreference } from "@/features/org/model/org-preferences";
import type { OrganizationSummary } from "@/features/org/api/org-api";

export const ORG_QUERY_KEY = ["orgs", "accessible"] as const;

type OrgStoreState = {
  selectedOrg: OrganizationSummary | null;
  availableOrgs: OrganizationSummary[];
  loading: boolean;
  error: Error | null;
  setFromQuery: (payload: {
    availableOrgs: OrganizationSummary[];
    loading: boolean;
    error: Error | null;
  }) => void;
  selectOrg: (orgId: string) => Promise<void>;
  refreshOrgs: () => Promise<OrganizationSummary[]>;
  createOrg: (data: { name: string; slug: string }) => Promise<OrganizationSummary>;
};

function resolveSelectedOrg(
  current: OrganizationSummary | null,
  availableOrgs: OrganizationSummary[],
): OrganizationSummary | null {
  if (availableOrgs.length === 0) {
    return null;
  }

  if (current && availableOrgs.some((org) => org.id === current.id)) {
    return current;
  }

  const preferredOrgId = getStoredPreference();
  if (preferredOrgId) {
    return availableOrgs.find((org) => org.id === preferredOrgId) ?? null;
  }

  return null;
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
        let org = availableOrgs.find((candidate) => candidate.id === orgId) ?? null;

        if (!org) {
          const refreshed = await queryClient.fetchQuery({
            queryKey: ORG_QUERY_KEY,
            queryFn: fetchAccessibleOrganizations,
          });
          availableOrgs = refreshed ?? [];
          org = availableOrgs.find((candidate) => candidate.id === orgId) ?? null;
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
