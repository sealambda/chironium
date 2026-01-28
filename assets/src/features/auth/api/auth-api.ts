import { requestGraphql } from "@/shared/api/graphql";
import { type User } from "@/gql/graphql";
import { graphql } from "@/gql";

const CurrentUserQuery = graphql(`
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
`);

/**
 * Fetch the current authenticated user from the backend.
 * Returns null if not authenticated.
 *
 * Uses session cookies for authentication.
 */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const result = await requestGraphql({
      document: CurrentUserQuery,
    });

    const user = result.currentUser;
    if (!user) {
      return null;
    }

    // Transform GraphQL response to User type.
    return {
      id: user.id,
      email: user.email,
      person: user.person,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
