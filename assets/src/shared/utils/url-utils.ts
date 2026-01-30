/**
 * URL constants for API and auth endpoints.
 *
 * All paths are relative since the PWA is always served through Phoenix
 * (both in dev and prod), making everything same-origin.
 */

/**
 * API endpoint paths.
 */
export const API_PATHS = {
  graphql: "/gql",
} as const;

/**
 * Auth page paths for full-page navigation.
 * These are Phoenix-rendered HTML pages.
 */
export const AUTH_URLS = {
  signIn: "/sign-in",
  signOut: "/sign-out",
} as const;
