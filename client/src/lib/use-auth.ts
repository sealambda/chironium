import { useContext } from 'react';
import { AuthContext } from './auth-context';
import type { AuthState } from './auth-types';

/**
 * Hook to access authentication state.
 *
 * @throws {Error} If used outside of AuthProvider
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
