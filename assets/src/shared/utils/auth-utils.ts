/**
 * Authentication utility functions for API requests.
 *
 * Separated from auth.tsx to avoid breaking Fast Refresh when editing
 * authentication components.
 */

/**
 * Base URL for backend endpoints that serve HTML pages (OAuth flows, etc).
 * Use same-origin in development via Vite proxy to keep session cookies working.
 * Set VITE_BACKEND_URL only when you intentionally bypass the proxy.
 * In production, this should be the same as the API base or the main domain.
 */
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";

function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const metaTag = document.querySelector("meta[name='csrf-token']");
  return metaTag?.getAttribute("content") ?? null;
}

/**
 * Build headers for authenticated API requests.
 */
export function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["x-csrf-token"] = csrfToken;
  }

  return headers;
}
