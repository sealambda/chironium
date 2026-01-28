/**
 * Authentication type definitions.
 *
 * Shared to avoid cross-feature dependencies and keep auth types stable.
 */

/**
 * Person information returned from the backend.
 * Mirrors the GraphQL `currentUser` response shape.
 */
export interface Person {
  id: string;
  givenName: string | null;
  stSurname: string | null;
  ndSurname: string | null;
  birthDate: string | null;
}

export interface User {
  id: string;
  email: string;
  personId: string;
  person?: Person | null;
}

/**
 * Authentication state provided throughout the application.
 * Follows TanStack Router context patterns for type-safe auth.
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
