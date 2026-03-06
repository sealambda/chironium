import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const AllGoalsByPersonQuery = graphql(`
  query AllGoalsByPerson($personId: ID!) {
    listPatients(filter: { personId: { eq: $personId } }, first: 1) {
      results {
        goals(sort: [{ field: PRIORITY, order: ASC }]) {
          id
          lifecycleStatus
          achievementStatus
          priority
          description {
            text
          }
          startDate
          dueDate
          category
          note {
            text
            time
            authorString
          }
        }
      }
    }
  }
`);

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

// ─── Types ───────────────────────────────────────────────────────────

/** A single goal record returned by the list query. */
export type GoalRecord = NonNullable<
  NonNullable<
    NonNullable<ResultOf<typeof AllGoalsByPersonQuery>["listPatients"]>["results"]
  >[number]["goals"]
>[number];

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Fetch all goals for a person (all lifecycle statuses), for the list page.
 */
export async function fetchAllGoals(
  personId: string,
  organizationId: string,
): Promise<GoalRecord[]> {
  if (!personId || !organizationId) {
    return [];
  }

  const data = await requestGraphql({
    document: AllGoalsByPersonQuery,
    variables: { personId },
    organizationId,
  });

  const patient = data.listPatients?.results?.[0];
  return patient?.goals ?? [];
}

/**
 * Parameters for creating a new goal.
 */
export interface CreateGoalParams {
  description: string;
  subjectId: string;
  organizationId: string;
  userId: string;
  priority?: "HIGH_PRIORITY" | "MEDIUM_PRIORITY" | "LOW_PRIORITY";
  category?: ("DIETARY" | "BEHAVIORAL" | "NURSING" | "PHYSIOTHERAPY" | "SAFETY")[];
  startDate?: string;
  dueDate?: string;
}

/**
 * Create a goal for a patient with the given description and optional fields.
 */
export async function createGoal({
  description,
  subjectId,
  organizationId,
  userId,
  priority,
  category,
  startDate,
  dueDate,
}: CreateGoalParams): Promise<void> {
  const result = await requestGraphql({
    document: CreateGoalMutation,
    variables: {
      input: {
        lifecycleStatus: "ACTIVE",
        description: { text: description },
        note: [{ text: description, authorReference: userId, time: new Date().toISOString() }],
        subjectId,
        ...(priority && { priority }),
        ...(category?.length && { category }),
        ...(startDate && { startDate }),
        ...(dueDate && { dueDate }),
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createGoal, "Failed to create goal.");
}
