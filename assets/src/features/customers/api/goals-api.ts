import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Mutations ───────────────────────────────────────────────────────

const CreateGoalMutation = graphql(`
  mutation CreateGoal($input: CreateGoalInput!) {
    createGoal(input: $input) {
      result {
        id
        lifecycleStatus
      }
      errors {
        message
      }
    }
  }
`);

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Create a goal for a patient with the given description.
 */
export async function createGoal(
  description: string,
  subjectId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CreateGoalMutation,
    variables: {
      input: {
        lifecycleStatus: "ACTIVE",
        description: { text: description },
        note: [{ text: description, authorReference: userId, time: new Date().toISOString() }],
        subjectId,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createGoal, "Failed to create goal.");
}
