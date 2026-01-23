/**
 * Authentication type definitions.
 *
 * Separated to avoid circular dependencies between auth modules.
 */

/**
 * User information returned from the backend.
 * Matches the User resource from Chironium.Core.Identity.User.
 */
export interface User {
  id: string;
  email: string;
  person?: {
    id: string;
    given_name: string | null;
    st_surname: string | null;
    nd_surname: string | null;
  } | null;
}

/**
 * Authentication state provided throughout the application.
 * Follows TanStack Router context patterns for type-safe auth.
 *
 * Note: Authentication is handled by the Elixir backend via Ash Authentication.
 * The PWA only checks session status and redirects to the backend for sign-in.
 * This ensures a single source of truth for auth logic and avoids duplication.
 */
export interface AuthState {
  /** Whether authentication check has completed. */
  isLoading: boolean;
  /** Whether user is currently authenticated. */
  isAuthenticated: boolean;
  /** Authenticated user data, null if not logged in. */
  user: User | null;
  /**
   * Redirect to the backend sign-in page.
   * Uses the Elixir backend's Ash Authentication routes.
   * The backend captures the Referer header to redirect back after auth.
   */
  redirectToSignIn: () => void;
  /**
   * Log out the current user via the backend.
   * Navigates to backend /sign-out which revokes token and redirects to PWA.
   * This is a full-page navigation, so no Promise is returned.
   */
  logout: () => void;
  /** Refresh the current user from the server. */
  refreshUser: () => Promise<void>;
}
