defmodule Chironium.Health.Task.Status do
  @moduledoc """
  The current status of the task.

  https://hl7.org/fhir/R5/valueset-task-status.html
  """

  use Ash.Type.Enum,
    values: [
      draft: [
        label: "Draft",
        description: "The task is not yet ready to be acted upon."
      ],
      requested: [
        label: "Requested",
        description: "The task is ready to be acted upon and action is sought."
      ],
      received: [
        label: "Received",
        description:
          "A potential performer has claimed ownership of the task and is evaluating whether to perform it."
      ],
      accepted: [
        label: "Accepted",
        description:
          "The potential performer has agreed to execute the task but has not yet started work."
      ],
      rejected: [
        label: "Rejected",
        description:
          "The potential performer who claimed ownership of the task has decided not to execute it prior to performing any action."
      ],
      ready: [
        label: "Ready",
        description:
          "The task is ready to be performed, but no action has yet been taken. Used in place of requested/received/accepted/rejected when request assignment and acceptance is a given."
      ],
      cancelled: [
        label: "Cancelled",
        description: "The task was not completed."
      ],
      in_progress: [
        label: "In Progress",
        description: "The task has been started but is not yet complete."
      ],
      on_hold: [
        label: "On Hold",
        description: "The task has been started but work has been paused."
      ],
      failed: [
        label: "Failed",
        description: "The task was attempted but could not be completed due to some error."
      ],
      completed: [
        label: "Completed",
        description: "The task has been completed."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description:
          "The task should never have existed and is retained only because of the possibility it may have been used."
      ]
    ]

  def graphql_type(_), do: :task_status
end
