import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";

import { PortalApp } from "@/portal/portal-app";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { Toaster } from "@/shared/ui/sonner";

// A patient's session can end at any time; retrying won't bring it back.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

/**
 * Providers for the patient portal. Deliberately minimal: no analytics, no
 * organization or user stores, no devtools.
 */
export function PortalProviders() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system">
          <PortalApp />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}
