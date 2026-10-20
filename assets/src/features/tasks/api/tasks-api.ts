import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

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
        accessExpiresAt
        dueAt
        focusQuestionnaireId
        focusQuestionnaire {
          id
          title
        }
        requesterName
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
          changedByPatient {
            id
          }
        }
      }
    }
  }
`);

const ListPendingTasksQuery = graphql(`
  query ListPendingTasks {
    listPendingTasks {
      id
      status
      description
      dueAt
      accessExpiresAt
      focusQuestionnaireId
      focusQuestionnaire {
        title
      }
      forPatient {
        id
        personId
        person {
          name {
            text
            given
            family
            prefix
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

const CancelTaskMutation = graphql(`
  mutation CancelTask($id: ID!) {
    cancelTask(id: $id) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const DeleteTaskMutation = graphql(`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const UpdateTaskMutation = graphql(`
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      result {
        id
        requestedPeriod {
          start
          end
        }
      }
      errors {
        message
      }
    }
  }
`);

export type PatientTask = NonNullable<
  NonNullable<ResultOf<typeof ListTasksForPatientQuery>["listTasks"]>["results"]
>[number];

/** Whether a task asks the patient to fill in a questionnaire, rather than being a reminder. */
export function isQuestionnaireRequestTask(
  task: Pick<PatientTask, "focusQuestionnaireId">,
): boolean {
  // The id survives even when the questionnaire itself is no longer readable.
  return task.focusQuestionnaireId != null;
}

export type PendingTask = ResultOf<typeof ListPendingTasksQuery>["listPendingTasks"][number];

export interface CreateTaskParams {
  organizationId: string;
  patientId: string;
  description: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateTaskReminderParams {
  organizationId: string;
  taskId: string;
  description?: string;
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

export async function completeTaskReminder(taskId: string, organizationId: string): Promise<void> {
  if (!taskId || !organizationId) {
    return;
  }

  const completed = await requestGraphql({
    document: CompleteTaskMutation,
    variables: { id: taskId },
    organizationId,
  });
  unwrapMutationResult(completed.completeTask, "Failed to complete task.");
}

/** Cancel a task. For a questionnaire request, this also revokes its links. */
export async function cancelTask(taskId: string, organizationId: string): Promise<void> {
  const result = await requestGraphql({
    document: CancelTaskMutation,
    variables: { id: taskId },
    organizationId,
  });

  unwrapMutationResult(result.cancelTask, `Failed to cancel task ${taskId}.`);
}

export async function deleteTaskReminder(taskId: string, organizationId: string): Promise<void> {
  if (!taskId || !organizationId) {
    return;
  }

  const result = await requestGraphql({
    document: DeleteTaskMutation,
    variables: { id: taskId },
    organizationId,
  });

  unwrapMutationResult(result.deleteTask, "Failed to delete reminder.");
}

export async function updateTaskReminder({
  organizationId,
  taskId,
  description,
  startDate,
  endDate,
}: UpdateTaskReminderParams): Promise<void> {
  const descriptionInput = description === undefined ? {} : { description: description.trim() };

  const result = await requestGraphql({
    document: UpdateTaskMutation,
    variables: {
      id: taskId,
      input: {
        ...descriptionInput,
        requestedPeriod: {
          ...(startDate ? { start: startDate } : { start: null }),
          ...(endDate ? { end: endDate } : { end: null }),
        },
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.updateTask, "Failed to update reminder.");
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

/** Overdue or link-expired questionnaire requests and due reminders, across the organization's visible patients. */
export async function fetchPendingTasks(organizationId: string): Promise<PendingTask[]> {
  const result = await requestGraphql({
    document: ListPendingTasksQuery,
    organizationId,
  });

  return result.listPendingTasks;
}
