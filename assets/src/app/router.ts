import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";

/**
 * Create and configure the TanStack Router instance.
 *
 * Note: Auth context is no longer needed because Phoenix guarantees
 * authentication before the PWA loads. Route guards have been removed.
 */
export const router = createRouter({
  routeTree,
  basepath: "/app",
  defaultPreload: "intent",
  scrollRestoration: true,
  context: {},
});

// Register the router instance for type safety.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
