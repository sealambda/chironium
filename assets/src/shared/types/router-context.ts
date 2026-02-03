/**
 * Router context type for TanStack Router.
 * Used with createRootRouteWithContext for type-safe context in routes.
 *
 * Note: Auth state is intentionally NOT included because Phoenix
 * handles authentication before the PWA loads. The frontend trusts
 * that if it's running, the user is authenticated.
 *
 * @example
 * ```tsx
 * import { createRootRouteWithContext } from '@tanstack/react-router';
 * import type { RouterContext } from '@/shared/types/router-context';
 *
 * export const Route = createRootRouteWithContext<RouterContext>()({
 *   component: RootComponent,
 * });
 * ```
 */
// biome-ignore lint/complexity/noBannedTypes: Empty object is intentional - RouterContext is a placeholder for future context properties that routes may need.
export type RouterContext = {};
