import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchCurrentUser } from "../api/auth-api";
import { AUTH_QUERY_KEY, useAuthStore } from "./auth-store";

/**
 * Syncs the auth store with the current user query.
 * Render once near the app root to keep auth state consistent.
 */
export function AuthStoreSync() {
  const setFromQuery = useAuthStore((state) => state.setFromQuery);
  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
  });

  useEffect(() => {
    setFromQuery({ user: user ?? null, isLoading });
  }, [user, isLoading, setFromQuery]);

  return null;
}
