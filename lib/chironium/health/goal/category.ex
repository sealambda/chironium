defmodule Chironium.Health.Goal.Category do
  @moduledoc """
  Example codes for grouping goals to use for filtering or presentation.

  https://hl7.org/fhir/R5/valueset-goal-category.html
  """

  use Ash.Type.Enum,
    values: [
      dietary: [
        label: "Dietary",
        description: "Goals related to the consumption of food and/or beverages."
      ],
      safety: [
        label: "Safety",
        description: "Goals related to the personal protection of the subject."
      ],
      behavioral: [
        label: "Behavioral",
        description: "Goals related to the manner in which the subject acts."
      ],
      nursing: [
        label: "Nursing",
        description: "Goals related to the practice of nursing or established by nurses."
      ],
      physiotherapy: [
        label: "Physiotherapy",
        description: "Goals related to the mobility and/or motor capability of the subject."
      ]
    ]

  def graphql_type(_), do: :goal_category
end
