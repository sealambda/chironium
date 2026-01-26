/**
 * Authentication utility functions for API requests.
 *
 * Separated from auth.tsx to avoid breaking Fast Refresh when editing
 * authentication components.
 */

/**
 * Base URL for backend endpoints that serve HTML pages (OAuth flows, etc).
 * These cannot go through Vite proxy because the HTML response contains
 * references to backend assets that Vite doesn't have.
 * In development, this is the Phoenix server URL.
 * In production, this should be the same as the API base or the main domain.
 */
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const TOKEN_STORAGE_KEY = "chironium_auth_token";

/**
 * Get the current auth token from sessionStorage.
 * Returns null if no token is stored.
 */
export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // sessionStorage not available (e.g., private browsing).
    return null;
  }
}

/**
 * Build headers for authenticated API requests.
 * Includes Authorization header with Bearer token if available.
 */
export function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
  };

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
