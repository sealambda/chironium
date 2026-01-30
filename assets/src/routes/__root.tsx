import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import type { RouterContext } from "@/shared/types/router-context";

/**
 * Root route with router context.
 *
 * Note: Auth checks are no longer performed here because Phoenix
 * guarantees authentication before the PWA loads. If you're seeing
 * this component, you're authenticated.
 *
 * AppShell is rendered in _authenticated layout, not here.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

/**
 * Not found component for unmatched routes.
 */
function NotFoundComponent() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-semibold text-2xl">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="text-primary text-sm hover:underline">
          Go to home
        </a>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
    </>
  );
}
