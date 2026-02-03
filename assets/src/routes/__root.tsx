import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

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
  errorComponent: ErrorComponent,
});

/**
 * Error boundary component for uncaught errors.
 */
function ErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-semibold text-2xl">Something went wrong</h1>
        <p className="max-w-md text-center text-muted-foreground text-sm">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
        {import.meta.env.DEV && (
          <pre className="max-w-lg overflow-auto rounded bg-muted p-4 text-left font-mono text-xs">
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
        >
          Try again
        </button>
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
