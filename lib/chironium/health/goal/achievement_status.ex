defmodule Chironium.Health.Goal.AchievementStatus do
  @moduledoc """
  Describes the progression, or lack thereof, towards the goal against the target.

  https://hl7.org/fhir/R5/valueset-goal-achievement.html
  """

  use Ash.Type.Enum,
    values: [
      in_progress: [
        label: "In Progress",
        description:
          "The goal is being sought but has not yet been reached. (Also applies if the goal was reached in the past but there has been regression and the goal is again being sought)."
      ],
      improving: [
        label: "Improving",
        description: "The goal is being sought, and is progressing."
      ],
      worsening: [
        label: "Worsening",
        description: "The goal is being sought, but is regressing."
      ],
      no_change: [
        label: "No Change",
        description: "The goal is being sought, but the trend is flat."
      ],
      achieved: [
        label: "Achieved",
        description: "The goal has been met."
      ],
      sustaining: [
        label: "Sustaining",
        description:
          "The goal has been met, but ongoing activity is needed to sustain the goal objective."
      ],
      not_achieved: [
        label: "Not Achieved",
        description:
          "The goal has not been met and there might or might not have been progress towards target."
      ],
      no_progress: [
        label: "No Progress",
        description: "The goal has not been met and little to no progress towards target."
      ],
      not_attainable: [
        label: "Not Attainable",
        description: "The goal is not possible to be met."
      ]
    ]

  def graphql_type(_), do: :goal_achievement_status
end
