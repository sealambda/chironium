import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "../store/auth-store";
import type { AuthState } from "../types";

/**
 * Hook to access authentication state.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user, redirectToSignIn } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={redirectToSignIn}>Sign In</button>;
 *   }
 *
 *   return <div>Welcome, {user?.email}</div>;
 * }
 * ```
 */
export function useAuth(): AuthState {
  return useAuthStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      redirectToSignIn: state.redirectToSignIn,
      logout: state.logout,
      refreshUser: state.refreshUser,
    })),
  );
}
