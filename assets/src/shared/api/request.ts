import { buildHeaders } from "@/shared/utils/auth-utils";

/**
 * Build auth-aware headers for API requests.
 */
export function getAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    ...buildHeaders(),
    ...headers,
  };
}
