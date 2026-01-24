// import "vite/modulepreload-polyfill";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter } from "@tanstack/react-router";

import { AuthProvider } from "@/lib/auth";
import { InnerApp } from "@/components/inner-app";

import "./index.css";

// Import the generated route tree.
import { routeTree } from "./routeTree.gen";

// Create a new router instance with auth context placeholder.
const router = createRouter({
  routeTree,
  basepath: "/app",
  defaultPreload: "intent",
  scrollRestoration: true,
  context: {
    // Auth will be provided by InnerApp component.
    auth: undefined!,
  },
});

// Register the router instance for type safety.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Create a query client for TanStack Query.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes.
      gcTime: 1000 * 60 * 30, // 30 minutes.
    },
  },
});

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
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InnerApp router={router} />
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
);
