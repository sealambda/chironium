import { postGraphql } from "@/shared/api/graphql";
import { getApiBase, getAuthHeaders } from "@/shared/api/request";
import type { User } from "@/shared/types/auth";

/**
 * Base URL for API requests (GraphQL, etc.).
 * In development, this is empty to use Vite's proxy.
 * In production, this should point to the backend.
 */
const API_BASE = getApiBase();

/**
 * Fetch the current authenticated user from the backend.
 * Returns null if not authenticated.
 *
 * Uses session cookies for authentication.
 */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const headers = getAuthHeaders({
      "Content-Type": "application/json",
    });
    const result = await postGraphql<{
      currentUser: {
        id: string;
        email: string;
        person?: {
          id: string;
          givenName?: string | null;
          stSurname?: string | null;
          ndSurname?: string | null;
          birthDate?: string | null;
        } | null;
      } | null;
    }>({
      apiBase: API_BASE,
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
      headers,
    });

    const user = result.currentUser;
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
