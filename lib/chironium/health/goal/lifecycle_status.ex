defmodule Chironium.Health.Goal.LifecycleStatus do
  @moduledoc """
  Codes that reflect the current state of a goal and whether the goal is still being targeted.

  https://hl7.org/fhir/R5/valueset-goal-status.html
  """

  use Ash.Type.Enum,
    values: [
      proposed: [
        label: "Proposed",
        description: "A goal is proposed for this patient."
      ],
      planned: [
        label: "Planned",
        description: "A goal is planned for this patient."
      ],
      accepted: [
        label: "Accepted",
        description: "A proposed goal was accepted or acknowledged."
      ],
      active: [
        label: "Active",
        description: "The goal is being sought actively."
      ],
      on_hold: [
        label: "On Hold",
        description:
          "The goal remains a long term objective but is no longer being actively pursued for a temporary period of time."
      ],
      completed: [
        label: "Completed",
        description: "The goal is no longer being sought."
      ],
      cancelled: [
        label: "Cancelled",
        description: "The goal has been abandoned."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description: "The goal was entered in error and voided."
      ],
      rejected: [
        label: "Rejected",
        description: "A proposed goal was rejected."
      ]
    ]

  def graphql_type(_), do: :goal_lifecycle_status
end
