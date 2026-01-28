import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchAccessibleOrganisations } from "../api/org-api";
import { ORG_QUERY_KEY, useOrgStore } from "./org-store";

/**
 * Syncs the org store with accessible organisation queries.
 * Render within authenticated routes to keep org state fresh.
 */
export function OrgStoreSync() {
  const setFromQuery = useOrgStore((state) => state.setFromQuery);
  const { data, isLoading, error } = useQuery({
    queryKey: ORG_QUERY_KEY,
    queryFn: fetchAccessibleOrganisations,
  });

  useEffect(() => {
    setFromQuery({
      availableOrgs: data ?? [],
      loading: isLoading,
      error: error instanceof Error ? error : error ? new Error("Unknown error") : null,
    });
  }, [data, isLoading, error, setFromQuery]);

  return null;
}
