import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AUTH_URLS } from "@/shared/utils/url-utils";
import { fetchCurrentUser } from "../api/user-api";
import { USER_QUERY_KEY, useUserStore } from "./user-store";

/**
 * Syncs the user store with the current user query.
 * Render once near the app root to keep user state consistent.
 *
 * If a fetch error occurs (e.g., session expired), redirects to sign-in.
 */
export function UserStoreSync() {
  const setFromQuery = useUserStore((state) => state.setFromQuery);
  const { data, isLoading, error } = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: (failureCount, err) => {
      // Don't retry if session expired - redirect instead.
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

  // Handle session expiration by redirecting to sign-in.
  useEffect(() => {
    if (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("session") || message.includes("expired")) {
        window.location.href = AUTH_URLS.signIn;
      }
    }
  }, [error]);

  return null;
}
