/**
 * Request utility functions for API calls.
 * Handles CSRF token injection and common headers.
 *
 * For URL configuration (API paths, auth URLs), see url-utils.ts.
 */

function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const metaTag = document.querySelector("meta[name='csrf-token']");
  return metaTag?.getAttribute("content") ?? null;
}

/**
 * Build headers for API requests with CSRF token.
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
