import { graphql } from "@/graphql";

/**
 * The only documents `/portal/gql` executes. Each is persisted: the client sends
 * its ID, and the server looks it up in `priv/graphql/portal-documents.json`
 * (`pnpm gql:persisted`). IDs are `sha256:` hashes of the printed document.
 *
 * KIND_MISMATCH: graphql@16.13 added `Kind.TYPE_COORDINATE`, which the `Kind` bundled
 * with gql.tada (`@0no-co/graphql.web`) lacks, so real documents fail the
 * `DocumentNodeLike` constraint of `graphql.persisted`. The result and variable types
 * are still inferred; drop the `@ts-expect-error` comments once the versions agree.
 */

const PortalRequestQuery = graphql(`
  query PortalRequest {
    listTasks {
      results {
        id
        description
        accessExpiresAt
        requesterName
        organizationName
        requestedPeriod {
          end
        }
        focusQuestionnaire {
          id
          title
          description
          item
        }
      }
    }
  }
`);

export const PortalRequestDocument = graphql.persisted<
  // @ts-expect-error See `KIND_MISMATCH` above.
  typeof PortalRequestQuery
>(
  // biome-ignore lint/security/noSecrets: A document hash, not a secret.
  "sha256:2b42c9d9a42722a87bb486a7b18f4962eb885ba7c27417bb29e1e4bdc607409f",
);

const PortalSubmitResponseMutation = graphql(`
  mutation PortalSubmitResponse($input: SubmitQuestionnaireResponseFromPortalInput!) {
    submitQuestionnaireResponseFromPortal(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

export const PortalSubmitResponseDocument = graphql.persisted<
  // @ts-expect-error See `KIND_MISMATCH` above.
  typeof PortalSubmitResponseMutation
>(
  // biome-ignore lint/security/noSecrets: A document hash, not a secret.
  "sha256:6341ec230840419c6f72011e235ac2c5562d8b9476564ea60316d2be6194a0f2",
);
