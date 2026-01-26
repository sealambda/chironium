import type { AuthState } from "./auth-types";

/**
 * Router context type that includes authentication state.
 * Used with createRootRouteWithContext for type-safe auth in routes.
 *
 * Separated from auth.tsx to maintain Fast Refresh compatibility.
 *
 * @example
 * ```tsx
 * import { createRootRouteWithContext } from '@tanstack/react-router';
 * import type { RouterContext } from '@/lib/router-context';
 *
 * export const Route = createRootRouteWithContext<RouterContext>()({
 *   component: RootComponent,
 * });
 * ```
 */
export interface RouterContext {
  auth: AuthState;
}
