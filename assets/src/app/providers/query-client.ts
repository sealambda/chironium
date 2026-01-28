import { QueryClient } from "@tanstack/react-query";

/**
 * Create a query client for TanStack Query with sensible defaults.
 * Configured for optimal caching and retry behavior.
 */
export const queryClient = new QueryClient({
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
