import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AuthContext } from "./auth-context";
import type { AuthState, User } from "./auth-types";
import { BACKEND_URL, buildHeaders } from "./auth-utils";

// Re-export types for backward compatibility.
export type { AuthState, User } from "./auth-types";

// ============================================================================
// API Functions
// ============================================================================

/**
 * Base URL for API requests (GraphQL, etc.).
 * In development, this is empty to use Vite's proxy.
 * In production, this should point to the backend.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Fetch the current authenticated user from the backend.
 * Returns null if not authenticated.
 *
 * Uses session cookies for authentication.
 */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    const headers = buildHeaders();
    const response = await fetch(`${API_BASE}/gql`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        query: `
          query CurrentUser {
            currentUser {
              id
              email
              person {
                id
                givenName
                stSurname
                ndSurname
                birthDate
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 401 || response.status === 403) {
        return null;
      }
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const result = await response.json();

    // Handle GraphQL errors.
    if (result.errors) {
      const isAuthError = result.errors.some(
        (err: { message: string }) =>
          err.message === "Not authenticated" || err.message.includes("unauthorized"),
      );
      if (isAuthError) {
        return null;
      }
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const user = result.data?.currentUser;
    if (!user) {
      return null;
    }

    // Transform GraphQL response to User type.
    return {
      id: user.id,
      email: user.email,
      personId: user.person?.id || "",
      person: user.person
        ? {
            id: user.person.id,
            givenName: user.person.givenName ?? null,
            stSurname: user.person.stSurname ?? null,
            ndSurname: user.person.ndSurname ?? null,
            birthDate: user.person.birthDate ?? null,
          }
        : null,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication provider component.
 * Manages auth state checking and provides auth methods to the application.
 *
 * Authentication flow:
 * 1. On mount, check session via GraphQL currentUser query.
 * 2. If authenticated, load user and proceed.
 * 3. If not authenticated, the route guards redirect to backend /sign-in.
 * 4. Backend handles Google OAuth / Magic Link authentication.
 * 5. Backend redirects back to the PWA using session cookies.
 *
 * Per Apple HIG: Ensures smooth authentication flow with clear loading states.
 * Per Carbon Design: Uses progressive disclosure - shows content after auth check.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Check for existing session on mount.
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      // Fetch current user using session cookie.
      const currentUser = await fetchCurrentUser();
      if (mounted) {
        setUser(currentUser);
        setIsLoading(false);
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Redirect to the backend sign-in page.
   * The backend handles all authentication methods (Google OAuth, Magic Link).
   * After successful auth, the backend redirects back to the PWA using the
   * Referer header (validated against allowed origins) to determine return URL.
   */
  const redirectToSignIn = useCallback(() => {
    // Full-page navigation to the backend sign-in.
    // The backend captures the Referer header to know where to redirect back.
    // We use BACKEND_URL (not API_BASE) because this is a full-page navigation
    // to the Phoenix server, not an API call through Vite's proxy.
    window.location.href = `${BACKEND_URL}/sign-in`;
  }, []);

  /**
   * Log out the current user.
   * Navigates to backend sign-out endpoint.
   * The backend will clear the session and redirect back to the PWA.
   */
  const logout = useCallback(() => {
    // Full page navigation to backend sign-out endpoint.
    window.location.href = `${BACKEND_URL}/sign-out`;
  }, []);

  /**
   * Refresh user data from the server.
   */
  const refreshUser = useCallback(async () => {
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
  }, []);

  const value: AuthState = {
    isLoading,
    isAuthenticated: user !== null,
    user,
    redirectToSignIn,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
