import { RouterProvider } from "@tanstack/react-router";
import type { routeTree } from "@/routeTree.gen";

type AppRouter = ReturnType<
  typeof import("@tanstack/react-router").createRouter<typeof routeTree>
>;

interface InnerAppProps {
  router: AppRouter;
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
