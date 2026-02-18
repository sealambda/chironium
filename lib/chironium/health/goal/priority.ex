defmodule Chironium.Health.Goal.Priority do
  @moduledoc """
  Indicates the level of importance associated with reaching or sustaining a goal.

  https://hl7.org/fhir/R5/valueset-goal-priority.html
  """

  use Ash.Type.Enum,
    values: [
      high_priority: [
        label: "High Priority",
        description:
          "Indicates that the goal is of considerable importance and should be a primary focus of care delivery."
      ],
      medium_priority: [
        label: "Medium Priority",
        description:
          "Indicates that the goal has a reasonable degree of importance and that concrete action should be taken towards the goal. Attainment is not as critical as high-priority goals."
      ],
      low_priority: [
        label: "Low Priority",
        description:
          "The goal is desirable but is not sufficiently important to devote significant resources to. Achievement of the goal may be sought when incidental to achieving other goals."
      ]
    ]

  def graphql_type(_), do: :goal_priority
end
