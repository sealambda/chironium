import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { AuthLoading } from "@/components/ui/auth-loading";
import { BACKEND_URL } from "@/lib/auth-utils";
import { OrgProvider } from "@/lib/org-provider";

/**
 * Authenticated layout route.
 * Protects all child routes by requiring authentication before access.
 *
 * Authentication is handled by the Elixir backend via Ash Authentication.
 * This route guard only checks session status - if not authenticated,
 * it redirects to the backend's /sign-in page which handles:
 * - Google OAuth sign-in.
 *
 * After successful authentication, the backend redirects back to the PWA
 * with a valid session cookie. The return_to parameter preserves the
 * intended destination for post-login redirect.
 *
 * Per TanStack Router authentication patterns:
 * - Uses beforeLoad to check auth status before rendering.
 * - Redirects to backend /sign-in with the original location for post-login redirect.
 * - Prevents flash of protected content using beforeLoad (not useEffect).
 *
 * Note: AppShell is rendered here (not in root) so that public routes
 * can render without the navigation shell.
 */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/c18d8461-c6a0-4696-9f5f-82aa23ca0758", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H3",
        location: "_authenticated.tsx:31",
        message: "Auth guard evaluated",
        data: {
          isLoading: context.auth.isLoading,
          isAuthenticated: context.auth.isAuthenticated,
          path: window.location.pathname,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    // Wait for auth check to complete before making decisions.
    // This prevents redirect loops when the page loads with a token.
    if (context.auth.isLoading) {
      return;
    }
    // Check if user is authenticated via the router context.
    if (!context.auth.isAuthenticated) {
      // Full browser redirect to backend sign-in page.
      // The backend captures the Referer header to know where to redirect back.
      // TanStack Router's redirect() only works for client routes.
      // For backend routes, we need a full page navigation.
      // Use BACKEND_URL directly (not proxy) because HTML pages from backend
      // reference backend assets that Vite doesn't have.
      window.location.href = `${BACKEND_URL}/sign-in`;
      // Throw to halt rendering while redirect is in progress.
      throw new Error("Redirecting to sign-in...");
    }
  },
  // Show loading state while auth is being checked.
  pendingComponent: AuthLoading,
  component: AuthenticatedLayout,
});

/**
 * Layout component for authenticated routes.
 * Wraps all authenticated pages in the AppShell with navigation.
 */
function AuthenticatedLayout() {
  return (
    <OrgProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </OrgProvider>
  );
}
