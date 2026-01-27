// Polyfill for modulepreload in older browsers.
// Required for Vite backend integration.
// https://vitejs.dev/guide/backend-integration.html
import "vite/modulepreload-polyfill";

import { registerSW } from "virtual:pwa-register";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InnerApp } from "@/components/inner-app";
import { AuthProvider } from "@/lib/auth";

import "./index.css";

// Type for auth context - will be provided at runtime by InnerApp.
import type { AuthState } from "@/lib/auth-types";
// Import the generated route tree.
import { routeTree } from "./routeTree.gen";

// Create a new router instance with auth context placeholder.
// The context is typed but initialized as undefined - InnerApp provides the actual value.
const router = createRouter({
  routeTree,
  basepath: "/app",
  defaultPreload: "intent",
  scrollRestoration: true,
  context: {
    // Auth will be provided by InnerApp component at runtime.
    auth: undefined as unknown as AuthState,
  },
});

// Register the router instance for type safety.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Create a query client for TanStack Query with sensible defaults.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes.
      gcTime: 1000 * 60 * 30, // 30 minutes.
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Safely mounts the React application to the DOM.
 * Handles the case where the root element might not exist.
 */
function mountApp(): void {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error(
      "Root element with id 'root' not found. " +
        'Ensure your HTML contains <div id="root"></div>.',
    );
    return;
  }

  /**
   * Root application component.
   * Wraps the app with all necessary providers.
   *
   * Provider order (outermost to innermost):
   * 1. StrictMode - React development checks.
   * 2. QueryClientProvider - TanStack Query for data fetching.
   * 3. AuthProvider - Authentication state management.
   * 4. InnerApp - Router with auth context.
   */
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InnerApp router={router} />
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </StrictMode>,
  );
}

// Mount the application.
mountApp();

registerSW({ immediate: true });
