defmodule Chironium.Terminology.Concept.ConceptContext do
  @moduledoc """
  Ash enum type for the clinical context argument on concept search queries.
  AshGraphql exposes this as the `ConceptContext` GraphQL enum.
  """

  use Ash.Type.Enum,
    values: [
      :allergy_intolerance,
      :condition,
      :food,
      :lab_result,
      :medication
    ]

  # AshGraphql reads these functions to name the generated GraphQL enum.
  def graphql_type(_), do: :concept_context
  def graphql_input_type(_), do: :concept_context
end
