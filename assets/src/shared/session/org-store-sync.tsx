import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { fetchAccessibleOrganizations } from "@/features/org/api/org-api";
import { ORG_QUERY_KEY } from "@/shared/utils/query-keys";

import { useOrgStore } from "./org-store";

/**
 * Syncs the org store with accessible organization queries.
 * Render within authenticated routes to keep org state fresh.
 */
export function OrgStoreSync() {
  const setFromQuery = useOrgStore((state) => state.setFromQuery);
  const { data, isLoading, error } = useQuery({
    queryKey: ORG_QUERY_KEY,
    queryFn: fetchAccessibleOrganizations,
  });

  useEffect(() => {
    let normalizedError: Error | null = null;
    if (error instanceof Error) {
      normalizedError = error;
    } else if (error) {
      normalizedError = new Error("Unknown error");
    }
    setFromQuery({
      availableOrgs: data ?? [],
      loading: isLoading,
      error: normalizedError,
    });
  }, [data, isLoading, error, setFromQuery]);

  return null;
}
