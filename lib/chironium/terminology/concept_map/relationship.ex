defmodule Chironium.Terminology.ConceptMap.Relationship do
  @moduledoc """
  Relationship between a source concept and target concept in a concept map entry.

  https://hl7.org/fhir/valueset-concept-map-relationship.html
  """

  use Ash.Type.Enum,
    values: [
      related_to: [
        label: "Related To",
        description:
          "The target concept is related to the source concept, but the relationship is not otherwise qualified."
      ],
      equivalent: [
        label: "Equivalent",
        description: "The source and target concepts are semantically equivalent."
      ],
      source_is_narrower_than_target: [
        label: "Source Is Narrower Than Target",
        description: "The source concept is narrower in meaning than the target concept."
      ],
      source_is_broader_than_target: [
        label: "Source Is Broader Than Target",
        description: "The source concept is broader in meaning than the target concept."
      ],
      not_related_to: [
        label: "Not Related To",
        description: "The target concept does not map to the source concept."
      ]
    ]

  def graphql_type(_), do: :concept_map_relationship
end
