import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import * as m from "@/paraglide/messages";
import type { RouterContext } from "@/shared/types/router-context";

/**
 * Root route with router context.
 *
 * Auth is handled by Phoenix before the PWA loads.
 * AppShell is rendered in _app layout, not here.
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
        <h1 className="font-semibold text-2xl">{m.error_not_found()}</h1>
        <p className="text-muted-foreground text-sm">
          {m.error_not_found_desc()}
        </p>
        <a href="/" className="text-primary text-sm hover:underline">
          {m.go_home()}
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
