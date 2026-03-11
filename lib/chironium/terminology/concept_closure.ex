defmodule Chironium.Terminology.ConceptClosure do
  @moduledoc """
  A Closure Table that pre-computes the transitive `is-a` hierarchy.
  This trades write-time cost (populating all ancestor–descendant pairs during ingest)
  for query-time performance (a single `EXISTS` join instead of a recursive `CTE`).

  The SNOMED RF2 `Relationship` file contains only direct `is-a` edges (`typeId = 116680003`).
  To build the full closure from direct edges, use a batch-insert recursive approach.
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
    table "concept_closures"
  end

  graphql do
    type :concept_closure
  end

  actions do
    defaults [:read]
  end

  # TODO: Add policies
  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :depth, :integer do
      description "Depth of the concept closure"
      public? true
      allow_nil? false
    end
  end

  relationships do
    belongs_to :ancestor, Chironium.Terminology.Concept do
      description "Ancestor concept represented by this closure row"
      source_attribute :parent_id
      public? true
      allow_nil? false
    end

    belongs_to :descendant, Chironium.Terminology.Concept do
      description "Descendant concept represented by this closure row"
      source_attribute :child_id
      public? true
      allow_nil? false
    end
  end

  identities do
    identity :ancestor_and_descendant, [:parent_id, :child_id]
  end
end
