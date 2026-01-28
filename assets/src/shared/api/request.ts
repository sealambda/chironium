import { buildHeaders } from "@/shared/utils/auth-utils";

/**
 * Resolve the API base URL for GraphQL requests.
 * In development, this is empty to use Vite's proxy.
 */
export function getApiBase(): string {
  return import.meta.env.VITE_API_BASE_URL || "";
}

/**
 * Build auth-aware headers for API requests.
 */
export function getAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    ...buildHeaders(),
    ...headers,
  };
}
