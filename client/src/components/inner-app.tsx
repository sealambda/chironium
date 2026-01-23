import { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { useAuth } from '@/lib/use-auth';
import type { RouterContext } from '@/lib/router-context';
import type { routeTree } from '@/routeTree.gen';

type AppRouter = ReturnType<typeof import('@tanstack/react-router').createRouter<typeof routeTree>>;

interface InnerAppProps {
  router: AppRouter;
}

/**
 * Inner app component that provides auth context to the router.
 * This pattern is recommended by TanStack Router for auth integration.
 *
 * Per TanStack Router authentication guide:
 * - Auth state is passed to the router via context.
 * - Router invalidates when auth state changes.
 */
export function InnerApp({ router }: InnerAppProps) {
  const auth = useAuth();

  // Invalidate router when auth state changes to trigger re-evaluation of routes.
  // This ensures beforeLoad guards re-run when user logs in/out.
  useEffect(() => {
    router.invalidate();
  }, [auth.isLoading, auth.isAuthenticated, router]);

  return <RouterProvider router={router} context={{ auth } satisfies RouterContext} />;
}
