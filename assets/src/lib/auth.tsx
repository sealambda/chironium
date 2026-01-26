import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AuthContext } from "./auth-context";
import type { AuthState, User } from "./auth-types";
import { BACKEND_URL, buildHeaders } from "./auth-utils";

// Re-export types for backward compatibility.
export type { AuthState, User } from "./auth-types";

// ============================================================================
// Token Storage (Internal)
// ============================================================================

const TOKEN_STORAGE_KEY = "chironium_auth_token";

/**
 * Store the auth token in sessionStorage.
 */
function storeToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // sessionStorage not available.
  }
}

/**
 * Clear the stored auth token from sessionStorage.
 */
function clearStoredToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // sessionStorage not available.
  }
}

/**
 * Extract auth token from URL fragment and clear it from the URL.
 * The backend passes the token as #token=... for security:
 * - Fragments are not sent to the server in HTTP requests.
 * - Fragments are not logged in server access logs.
 *
 * Validates that the token is non-empty and appears to be a valid JWT
 * (three dot-separated base64 segments).
 */
function extractTokenFromFragment(): string | null {
  const hash = window.location.hash;
  if (!hash || !hash.includes("token=")) {
    return null;
  }

  // Parse the fragment (e.g., #token=abc123 or #token=abc123&other=value).
  const params = new URLSearchParams(hash.substring(1));
  const token = params.get("token");

  // Clear the token from the URL regardless of validity.
  // Use replaceState to avoid adding to browser history.
  const cleanUrl = window.location.href.split("#")[0];
  window.history.replaceState(null, "", cleanUrl);

  // Validate token format: JWTs have three dot-separated base64 segments.
  if (!token || !token.trim()) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    console.warn("Invalid token format in URL fragment");
    return null;
  }

  return token;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Base URL for API requests (JSON:API, GraphQL, etc.).
 * In development, this is empty to use Vite's proxy.
 * In production, this should point to the backend.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Fetch the current authenticated user from the backend.
 * Returns null if not authenticated.
 *
 * Uses Bearer token authentication when available (cross-origin development).
 * Falls back to session cookies for same-origin requests (production).
 */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE}/api/json/users/me`, {
      method: "GET",
      credentials: "include",
      headers: buildHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Clear stored token if it's invalid.
        clearStoredToken();
        return null;
      }
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const data = await response.json();
    // Transform JSON:API response to User type.
    return {
      id: data.data.id,
      email: data.data.attributes.email,
      person: data.data.attributes.person || null,
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
 * 1. On mount, check for auth token in URL fragment (from OAuth redirect).
 * 2. If token found, store it and clear from URL.
 * 3. Check session via /api/json/users/me using stored token or session cookie.
 * 4. If authenticated, load user and proceed.
 * 5. If not authenticated, the route guards redirect to backend /sign-in.
 * 6. Backend handles Google OAuth / Magic Link authentication.
 * 7. Backend redirects back to PWA with auth token in URL fragment.
 *
 * Per Apple HIG: Ensures smooth authentication flow with clear loading states.
 * Per Carbon Design: Uses progressive disclosure - shows content after auth check.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Check for auth token in URL fragment and existing session on mount.
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      // Check for token in URL fragment (from OAuth redirect).
      const fragmentToken = extractTokenFromFragment();
      if (fragmentToken) {
        storeToken(fragmentToken);
      }

      // Fetch current user using stored token or session cookie.
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
   * Clears the local auth token and navigates to backend sign-out endpoint.
   * The backend will revoke the token, clear the session, and redirect back
   * to the PWA. Since auth will be invalid, the PWA redirects to sign-in.
   *
   * Note: We clear the token locally to avoid an unnecessary failed API call
   * when the PWA reloads and tries to use the (now-revoked) token.
   */
  const logout = useCallback(() => {
    clearStoredToken();
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
