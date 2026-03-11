defmodule Chironium.Terminology.ConceptEmbedding do
  @moduledoc """
  Stores the pgvector embedding for semantic search.
  """

  use Chironium.BaseResources.Identifiable,
    otp_app: :chironium,
    domain: Chironium.Terminology,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "concept_embeddings"
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
    attribute :model, :string do
      description "Embedding model identifier, e.g. 'text-embedding-3-small'"
      public? true
      allow_nil? false
    end

    attribute :vector, :vector do
      description "Embedding vector"
      public? true
      allow_nil? false
    end
  end

  relationships do
    belongs_to :concept, Chironium.Terminology.Concept do
      description "Concept this embedding belongs to"
      public? true
      allow_nil? false
    end
  end
end
