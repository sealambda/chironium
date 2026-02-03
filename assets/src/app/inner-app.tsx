import { RouterProvider } from "@tanstack/react-router";
import type { router } from "./router";

interface InnerAppProps {
  router: typeof router;
}

/**
 * Inner app component that provides the router.
 *
 * Note: Auth context is no longer passed to the router because
 * Phoenix guarantees authentication before the PWA loads.
 */
export function InnerApp({ router }: InnerAppProps) {
  return <RouterProvider router={router} context={{}} />;
}
