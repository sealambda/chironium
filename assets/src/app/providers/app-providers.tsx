import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StrictMode } from "react";

import { InnerApp } from "@/app/inner-app";
import { router } from "@/app/router";
import { UserStoreSync } from "@/features/user/store/user-store-sync";
import { LocaleProvider } from "@/shared/i18n/locale-provider";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { Toaster } from "@/shared/ui/sonner";

import { queryClient } from "./query-client";

/**
 * Root application providers.
 * Wraps the app with all necessary providers in the correct order.
 *
 * Provider order (outermost to innermost):
 * 1. StrictMode - React development checks.
 * 2. QueryClientProvider - TanStack Query for data fetching.
 * 3. UserStoreSync - Sync current user profile into Zustand.
 * 4. InnerApp - Router provider.
 */
export function AppProviders() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <UserStoreSync />
        <ThemeProvider defaultTheme="system">
          <LocaleProvider>
            <InnerApp router={router} />
          </LocaleProvider>
        </ThemeProvider>
        <Toaster />
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </StrictMode>
  );
}
