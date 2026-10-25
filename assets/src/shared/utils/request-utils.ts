/**
 * Request utility functions for API calls.
 * Handles CSRF token injection and common headers.
 *
 * For URL configuration (API paths, auth URLs), see url-utils.ts.
 */

export function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const metaTag = document.querySelector("meta[name='csrf-token']");
  return metaTag?.getAttribute("content") ?? null;
}

/**
 * Navigates with a plain form submit, so the server handles the request and redirects.
 * Phoenix reads `_method` to treat a POST as a DELETE.
 */
export function submitForm(action: string, method: "post" | "delete" = "post"): void {
  const form = document.createElement("form");
  form.method = "post";
  form.action = action;
  const fields = { _csrf_token: getCsrfToken() ?? "", _method: method };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
}

/**
 * Build headers for API requests with CSRF token.
 */
export function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    // biome-ignore lint/style/useNamingConvention: HTTP header name.
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["x-csrf-token"] = csrfToken;
  }

  return headers;
}
