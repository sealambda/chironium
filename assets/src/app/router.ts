import { createRouter } from "@tanstack/react-router";
import type { AuthState } from "@/features/auth/types";
import { routeTree } from "../routeTree.gen";

/**
 * Create and configure the TanStack Router instance.
 * Router is initialized with auth context placeholder - InnerApp provides the actual value.
 */
export const router = createRouter({
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
