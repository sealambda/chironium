defmodule Chironium.Terminology.Designation do
  @moduledoc """
  The multi-language text layer. One concept can have many designations across languages and use types.
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
    table "designations"

    custom_indexes do
      index "value gin_trgm_ops", using: "gin", name: "designations_value_trgm_index"
    end
  end

  graphql do
    type :designation
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
    attribute :language, :string do
      description "BCP 47 tag, e.g. 'en', 'de', 'fr'"
      public? true
      allow_nil? false
    end

    attribute :value, :string do
      description "The actual display text"
      public? true
      allow_nil? false
    end

    attribute :use, :string do
      description "The use of the designation"
      public? true
      allow_nil? false
    end
  end

  relationships do
    belongs_to :concept, Chironium.Terminology.Concept do
      description "Concept this designation belongs to"
      public? true
      allow_nil? false
    end
  end

  identities do
    identity :concept_language_use, [:concept_id, :language, :use, :value]
  end
end
