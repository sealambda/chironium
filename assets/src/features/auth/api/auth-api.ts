import { requestGraphql } from "@/shared/api/graphql";
import { type User } from "@/gql/graphql";
import { graphql } from "@/gql";

const CurrentActorQuery = graphql(`
  query CurrentActor {
    currentActor {
      id
      email
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
      document: CurrentActorQuery,
    });

    const user = result.currentActor;
    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
