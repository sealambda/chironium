import { graphql, type ResultOf } from "@/graphql";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────

/** Profile data for the currently authenticated user. */
export type UserProfile = NonNullable<ResultOf<typeof CurrentActorQuery>["currentActor"]>;

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Phoenix guarantees authentication before the PWA loads, so this
 * should always return a valid user. If it doesn't, the session
 * has likely expired.
 */
export async function fetchCurrentUser(): Promise<UserProfile> {
  const result = await requestGraphql({
    document: CurrentActorQuery,
  });

  const user = result.currentActor;
  if (!user) {
    throw new Error("User not found - session may have expired.");
  }

  return user;
}
