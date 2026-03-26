import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

const ListTasksQuery = graphql(`
  query ListTasks($first: Int, $sort: [TaskSortInput]) {
    listTasks(first: $first, sort: $sort) {
      results {
        id
        description
        status
        priority
        requestedPeriod {
          start
          end
        }
        forPatient {
          id
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

const ListPlanReviewTasksForPatientQuery = graphql(`
  query ListPlanReviewTasksForPatient($patientId: ID!) {
    listTasks(
      first: 250
      sort: [{ field: PRIORITY, order: DESC }]
      filter: {
        intent: { eq: PLAN }
        forPatientId: { eq: $patientId }
        status: { in: [ACCEPTED, READY] }
      }
    ) {
      results {
        id
        description
        requestedPeriod {
          start
          end
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
export type PendingPlanReviewTask = NonNullable<
  NonNullable<ResultOf<typeof ListPlanReviewTasksForPatientQuery>["listTasks"]>["results"]
>[number];

const SORT_BY_ID = [{ field: "ID" as const, order: "DESC" as const }];

export async function fetchTasks(organizationId: string): Promise<Task[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListTasksQuery,
    variables: {
      first: 250,
      sort: SORT_BY_ID,
    },
    organizationId,
  });

  const tasks = result.listTasks?.results ?? [];
  return tasks;
}

export async function fetchPendingPlanReviewTasksForPatient(
  patientId: string,
  organizationId: string,
): Promise<PendingPlanReviewTask[]> {
  if (!patientId || !organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListPlanReviewTasksForPatientQuery,
    variables: { patientId },
    organizationId,
  });

  const now = Date.now();
  const tasks = result.listTasks?.results ?? [];

  return tasks.filter((task) => {
    const start = task.requestedPeriod?.start;
    if (!start) {
      return false;
    }

    const startAt = Date.parse(start);
    return Number.isFinite(startAt) && startAt > now;
  });
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
        intent: "PLAN",
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
