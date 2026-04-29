import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

const ListTasksQuery = graphql(`
  query ListTasks($first: Int, $sort: [TaskSortInput]) {
    listTasks(first: $first, sort: $sort) {
      results {
        id
        intent
        status
        priority
        description
        requestedPeriod {
          start
          end
        }
        forPatient {
          id
          personId
          person {
            name {
              given
              family
              text
            }
          }
        }
      }
    }
  }
`);

const ListTasksForPatientQuery = graphql(`
  query ListTasksForPatient($patientId: ID!) {
    listTasks(
      first: 250
      sort: [{ field: REQUESTED_PERIOD_START_SORT_KEY, order: DESC }]
      filter: { forPatientId: { eq: $patientId } }
    ) {
      results {
        id
        intent
        status
        priority
        description
        requestedPeriod {
          start
          end
        }
        note {
          text
          time
          authorString
          authorReference
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
  }
`);

const CreateTaskMutation = graphql(`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const SetReadyTaskMutation = graphql(`
  mutation SetReadyTask($id: ID!) {
    setReadyTask(id: $id) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const StartTaskMutation = graphql(`
  mutation StartTask($id: ID!) {
    startTask(id: $id) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const CompleteTaskMutation = graphql(`
  mutation CompleteTask($id: ID!) {
    completeTask(id: $id) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

export type Task = NonNullable<
  NonNullable<ResultOf<typeof ListTasksQuery>["listTasks"]>["results"]
>[number];
export type PatientTask = NonNullable<
  NonNullable<ResultOf<typeof ListTasksForPatientQuery>["listTasks"]>["results"]
>[number];

const SORT_BY_REQUESTED_PERIOD_START = [
  { field: "REQUESTED_PERIOD_START_SORT_KEY" as const, order: "ASC" as const },
];

export async function fetchTasks(organizationId: string): Promise<Task[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListTasksQuery,
    variables: {
      first: 250,
      sort: SORT_BY_REQUESTED_PERIOD_START,
    },
    organizationId,
  });

  const tasks = result.listTasks?.results ?? [];
  return tasks;
}

export interface CreateTaskParams {
  organizationId: string;
  patientId: string;
  description: string;
  startDate?: string;
  endDate?: string;
}

export async function createTask({
  organizationId,
  patientId,
  description,
  startDate,
  endDate,
}: CreateTaskParams): Promise<void> {
  const result = await requestGraphql({
    document: CreateTaskMutation,
    variables: {
      input: {
        intent: "UNKNOWN",
        forPatientId: patientId,
        description: description.trim(),
        priority: "ROUTINE",
        ...((startDate || endDate) && {
          requestedPeriod: {
            ...(startDate && { start: startDate }),
            ...(endDate && { end: endDate }),
          },
        }),
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createTask, "Failed to create task.");

  const taskId = result.createTask?.result?.id;
  if (taskId) {
    const readyResult = await requestGraphql({
      document: SetReadyTaskMutation,
      variables: { id: taskId },
      organizationId,
    });
    unwrapMutationResult(readyResult.setReadyTask, "Failed to set task ready.");
  }
}

export async function completeReviewTask(taskId: string, organizationId: string): Promise<void> {
  if (!taskId || !organizationId) {
    return;
  }

  const started = await requestGraphql({
    document: StartTaskMutation,
    variables: { id: taskId },
    organizationId,
  });
  unwrapMutationResult(started.startTask, "Failed to start task.");

  const completed = await requestGraphql({
    document: CompleteTaskMutation,
    variables: { id: taskId },
    organizationId,
  });
  unwrapMutationResult(completed.completeTask, "Failed to complete task.");
}

/** Fetch all tasks for a specific patient (all intents, all statuses). Used by the activity feed. */
export async function fetchTasksForPatient(
  patientId: string,
  organizationId: string,
): Promise<PatientTask[]> {
  if (!patientId || !organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListTasksForPatientQuery,
    variables: { patientId },
    organizationId,
  });

  return result.listTasks?.results ?? [];
}
