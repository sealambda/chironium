import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StrictMode } from "react";
import { AuthStoreSync } from "@/features/auth/store/auth-store-sync";
import { InnerApp } from "../inner-app";
import { router } from "../router";
import { queryClient } from "./query-client";

/**
 * Root application providers.
 * Wraps the app with all necessary providers in the correct order.
 *
 * Provider order (outermost to innermost):
 * 1. StrictMode - React development checks.
 * 2. QueryClientProvider - TanStack Query for data fetching.
 * 3. AuthStoreSync - Sync auth state into Zustand.
 * 4. InnerApp - Router with auth context.
 */
export function AppProviders() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthStoreSync />
        <InnerApp router={router} />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </StrictMode>
  );
}
