import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import type { RouterContext } from "@/shared/types/router-context";

/**
 * Root route with authentication context.
 * Uses createRootRouteWithContext to provide type-safe auth state to all routes.
 *
 * Per TanStack Router patterns:
 * - Auth context is passed from main.tsx to the router.
 * - Child routes can access auth via Route.useRouteContext().
 * - Protected routes use beforeLoad to check authentication.
 *
 * Note: AppShell is rendered in _authenticated layout, not here.
 * This allows the login page to render without the navigation shell.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  // Show loading spinner when redirecting to backend sign-in.
  errorComponent: RedirectingComponent,
  // Handle 404s gracefully.
  notFoundComponent: NotFoundComponent,
});

/**
 * Component shown during redirect to backend sign-in.
 * The beforeLoad hooks throw an error after calling window.location.href
 * to halt rendering while the browser navigates.
 */
function RedirectingComponent() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Redirecting to sign in...</p>
      </div>
    </div>
  );
}

/**
 * Not found component for unmatched routes.
 */
function NotFoundComponent() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-semibold text-2xl">Page not found</h1>
        <p className="text-muted-foreground text-sm">The page you're looking for doesn't exist.</p>
        <a href="/" className="text-primary text-sm hover:underline">
          Go to home
        </a>
      </div>
    </div>
  );
}

function RootComponent() {
  const { auth } = Route.useRouteContext();

  // Show loading spinner while checking authentication.
  // This prevents flash of content before redirect.
  if (auth.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
    </>
  );
}
