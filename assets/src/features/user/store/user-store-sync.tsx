import { usePostHog } from "@posthog/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { fetchCurrentUser } from "@/features/user/api/user-api";
import { type Locale, locales, setLocale as setParaglideLocale } from "@/paraglide/runtime";
import { USER_QUERY_KEY } from "@/shared/utils/query-keys";

import { useUserStore } from "./user-store";

/**
 * Syncs the user store with the current user query.
 * Render once near the app root to keep user state consistent.
 */
export function UserStoreSync() {
  const setFromQuery = useUserStore((state) => state.setFromQuery);
  const posthog = usePostHog();
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

  useEffect(() => {
    if (!data) {
      return;
    }
    posthog?.identify(data.id, {
      email: data.email,
      name: data.name,
    });

    // Sync the backend preferred locale to Paraglide on initial load.
    const backendLocale = data.preferredLocale;
    if (backendLocale && locales.includes(backendLocale as Locale)) {
      void setParaglideLocale(backendLocale as Locale);
    }
  }, [data, posthog]);

  return null;
}
