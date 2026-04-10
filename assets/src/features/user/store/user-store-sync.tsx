import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { fetchCurrentUser } from "@/features/user/api/user-api";
import { USER_QUERY_KEY } from "@/shared/utils/query-keys";

import { useUserStore } from "./user-store";

/**
 * Syncs the user store with the current user query.
 * Render once near the app root to keep user state consistent.
 */
export function UserStoreSync() {
  const setFromQuery = useUserStore((state) => state.setFromQuery);
  const { data, isLoading, error } = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: (failureCount, err) => {
      // Don't retry auth errors - graphql.ts handles the redirect.
      const message = err instanceof Error ? err.message : "";
      if (message.includes("session") || message.includes("expired")) {
        return false;
      }
      return failureCount < 3;
    },
  });

  useEffect(() => {
    setFromQuery({
      user: data ?? null,
      isLoading,
      error: error instanceof Error ? error : null,
    });
  }, [data, isLoading, error, setFromQuery]);

  return null;
}
