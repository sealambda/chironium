defmodule Chironium.Terminology.ConceptMapEntry do
  @moduledoc """
  Stores one explicit source-to-target concept translation row.
  """

  use Chironium.BaseResources.Identifiable,
    otp_app: :chironium,
    domain: Chironium.Terminology,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [
      AshGraphql.Resource
    ]

  postgres do
    table "concept_map_entries"
  end

  graphql do
    type :concept_map_entry
  end

  actions do
    defaults [:read]
  end

  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :relationship, Chironium.Terminology.ConceptMap.Relationship do
      description "FHIR-style relationship from the source concept to the target concept"
      public? true
      allow_nil? false
    end

    attribute :comment, :string do
      description "Optional note that clarifies the mapping intent"
      public? true
    end
  end

  relationships do
    belongs_to :concept_map, Chironium.Terminology.ConceptMap do
      description "Concept map that owns this translation row"
      public? true
      allow_nil? false
    end

    belongs_to :source_concept, Chironium.Terminology.Concept do
      description "Source concept for the mapping"
      public? true
      allow_nil? false
    end

    belongs_to :target_concept, Chironium.Terminology.Concept do
      description "Target concept for the mapping"
      public? true
      allow_nil? false
    end
  end

  identities do
    identity :unique_mapping, [
      :concept_map_id,
      :source_concept_id,
      :target_concept_id,
      :relationship
    ]
  end
end
