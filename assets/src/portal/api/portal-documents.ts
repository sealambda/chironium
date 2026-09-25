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
  "sha256:2b42c9d9a42722a87bb486a7b18f4962eb885ba7c27417bb29e1e4bdc607409f",
  PortalRequestQuery,
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
  typeof PortalSubmitResponseMutation
>("sha256:6341ec230840419c6f72011e235ac2c5562d8b9476564ea60316d2be6194a0f2", PortalSubmitResponseMutation);
