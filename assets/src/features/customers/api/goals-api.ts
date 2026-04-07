import type { GoalCategory, GoalPriority } from "@/gql/graphql";
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
            authorReference
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

const UpdateGoalMutation = graphql(`
  mutation UpdateGoal($id: ID!, $input: UpdateGoalInput) {
    updateGoal(id: $id, input: $input) {
      result {
        id
        description {
          text
        }
      }
      errors {
        message
      }
    }
  }
`);

const DeleteGoalMutation = graphql(`
  mutation DeleteGoal($id: ID!) {
    deleteGoal(id: $id) {
      result {
        id
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

interface GoalMutationPayload<T> {
  result?: T | null;
  errors?: { message?: string | null }[] | null;
}

interface CreateGoalMutationResult {
  createGoal: GoalMutationPayload<{ id: string; lifecycleStatus: string }>;
}

interface UpdateGoalMutationResult {
  updateGoal: GoalMutationPayload<{ id: string; description?: { text?: string | null } | null }>;
}

interface DeleteGoalMutationResult {
  deleteGoal: GoalMutationPayload<{ id: string }>;
}

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
  userName: string;
  priority?: GoalPriority;
  category?: GoalCategory[];
  startDate?: string;
  dueDate?: string;
}

export interface UpdateGoalParams {
  id: string;
  organizationId: string;
  description: string;
  priority?: GoalPriority;
  category?: GoalCategory[];
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
  userName,
  priority,
  category,
  startDate,
  dueDate,
}: CreateGoalParams): Promise<void> {
  const result = await requestGraphql<CreateGoalMutationResult>({
    document: CreateGoalMutation,
    variables: {
      input: {
        lifecycleStatus: "ACTIVE",
        description: { text: description },
        note: [
          {
            text: description,
            ...(userId ? { authorReference: userId } : { authorString: userName }),
            time: new Date().toISOString(),
          },
        ],
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

/**
 * Update a goal fields.
 */
export async function updateGoal({
  id,
  organizationId,
  description,
  priority,
  category,
  startDate,
  dueDate,
}: UpdateGoalParams): Promise<void> {
  const result = await requestGraphql<UpdateGoalMutationResult>({
    document: UpdateGoalMutation,
    variables: {
      id,
      input: {
        description: { text: description },
        ...(priority ? { priority } : { priority: null }),
        ...(category?.length ? { category } : { category: [] }),
        ...(startDate ? { startDate } : { startDate: null }),
        ...(dueDate ? { dueDate } : { dueDate: null }),
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.updateGoal, "Failed to update goal.");
}

/**
 * Delete a goal.
 */
export async function deleteGoal(goalId: string, organizationId: string): Promise<void> {
  const result = await requestGraphql<DeleteGoalMutationResult>({
    document: DeleteGoalMutation,
    variables: { id: goalId },
    organizationId,
  });

  unwrapMutationResult(result.deleteGoal, "Failed to delete goal.");
}
