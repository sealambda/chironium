import { useShallow } from "zustand/react/shallow";

import type { User } from "@/gql/graphql";

import { useUserStore } from "../store/user-store";

export interface CurrentUserState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  refreshUser: () => Promise<User>;
}

/**
 * Hook to access current user profile data.
 *
 * This is NOT for authentication checks. Phoenix guarantees
 * that the PWA only loads for authenticated users. This hook is
 * purely for accessing user profile data for display purposes.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isLoading } = useCurrentUser();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return <div>Welcome, {user?.name || user?.email}</div>;
 * }
 * ```
 */
export function useCurrentUser(): CurrentUserState {
  return useUserStore(
    useShallow((state) => ({
      user: state.user,
      isLoading: state.isLoading,
      error: state.error,
      refreshUser: state.refreshUser,
    })),
  );
}
