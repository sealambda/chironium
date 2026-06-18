import { graphql } from "@/graphql";

/**
 * The only documents `/portal/gql` executes. Each is persisted: the client sends
 * its ID, and the server looks it up in `priv/graphql/portal-documents.json`
 * (`pnpm gql:persisted`). IDs are `sha256:` hashes of the printed document.
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
        organizationTimezone
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

export const PortalRequestDocument = graphql.persisted<typeof PortalRequestQuery>(
  // biome-ignore lint/security/noSecrets: A document hash, not a secret.
  "sha256:d435d0678208b5d72aa1bf202a7937edce048b81e60ddaa172fc46b741baf5cf",
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

export const PortalSubmitResponseDocument = graphql.persisted<typeof PortalSubmitResponseMutation>(
  // biome-ignore lint/security/noSecrets: A document hash, not a secret.
  "sha256:6341ec230840419c6f72011e235ac2c5562d8b9476564ea60316d2be6194a0f2",
);
