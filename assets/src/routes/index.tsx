import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthLoading } from "@/shared/ui/auth-loading";
import { BACKEND_URL } from "@/shared/utils/auth-utils";

/**
 * Index route redirects to customers since dashboard is currently disabled.
 * If not authenticated, redirect to backend sign-in.
 */
export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    // Wait for auth check to complete before making decisions.
    // This prevents redirect loops when the page loads with a token.
    if (context.auth.isLoading) {
      return;
    }
    // If not authenticated, redirect to backend sign-in.
    if (!context.auth.isAuthenticated) {
      // Full browser redirect to backend sign-in page.
      // The backend captures the Referer header to know where to redirect back.
      // Use BACKEND_URL directly (not proxy) because HTML pages from backend
      // reference backend assets that Vite doesn't have.
      window.location.href = `${BACKEND_URL}/sign-in`;
      // Throw to halt rendering while redirect is in progress.
      throw new Error("Redirecting to sign-in...");
    }
    // Dashboard is disabled, redirect to customers.
    throw redirect({ to: "/customers" });
  },
  // Show loading state while auth is being checked.
  pendingComponent: AuthLoading,
});
