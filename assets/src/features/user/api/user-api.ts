import { graphql } from "@/gql";
import type { User } from "@/gql/graphql";
import { requestGraphql } from "@/shared/api/graphql";

export type UserProfile = Omit<User, "paperTrailVersions">;

const CurrentActorQuery = graphql(`
  query CurrentActor {
    currentActor {
      id
      email
      picture
      name
      familyName
      givenName
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
export async function fetchCurrentUser(): Promise<UserProfile> {
  const result = await requestGraphql({
    document: CurrentActorQuery,
  });

  const user = result.currentActor;
  if (!user) {
    throw new Error("User not found - session may have expired");
  }

  return user;
}
