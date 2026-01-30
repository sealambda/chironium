import { graphql } from "@/gql";
import type { User } from "@/gql/graphql";
import { requestGraphql } from "@/shared/api/graphql";

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
 * Fetch the current user's profile data from the backend.
 *
 * Since Phoenix guarantees authentication before the PWA loads,
 * this should always return a valid user. If it doesn't, the
 * session has likely expired.
 *
 * Uses session cookies for authentication.
 */
export async function fetchCurrentUser(): Promise<User> {
  const result = await requestGraphql({
    document: CurrentUserQuery,
  });

  const user = result.currentUser;
  if (!user) {
    throw new Error("User not found - session may have expired");
  }

  return {
    id: user.id,
    email: user.email,
    person: user.person,
  };
}
