import { useShallow } from "zustand/react/shallow";

import type { UserProfile } from "@/features/user/api/user-api";
import { useUserStore } from "@/features/user/store/user-store";

export interface CurrentUserState {
  user: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refreshUser: () => Promise<UserProfile>;
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
