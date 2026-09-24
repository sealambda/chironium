defmodule Chironium.Terminology.ConceptMap do
  @moduledoc """
  Stores cross-system translation metadata between source and target concept spaces.

  This first pass models canonical metadata and explicit entry rows. Broader FHIR
  group and dependency semantics can be added later when translate operations mature.
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
    table "concept_maps"
  end

  graphql do
    type :concept_map
  end

  actions do
    defaults [:read]
  end

  policies do
    # Terminology is shared, non-clinical reference data.
    policy action_type(:read) do
      authorize_if always()
    end

    policy action_type([:create, :update, :destroy]) do
      authorize_if Chironium.Accounts.Checks.StaffActor
    end
  end

  attributes do
    attribute :url, :string do
      description "Canonical identifier for this concept map, represented as a URI"
      public? true
      allow_nil? false
    end

    attribute :version, :string do
      description "Business version of the concept map"
      public? true
    end

    attribute :name, :string do
      description "Computer-friendly identifier for this concept map"
      public? true
    end

    attribute :title, :string do
      description "Human-friendly title for this concept map"
      public? true
    end

    attribute :status, Chironium.Datatypes.PublicationStatus do
      description "Lifecycle status aligned with FHIR-style ConceptMap metadata"
      public? true
      allow_nil? false
    end

    attribute :description, :string do
      description "Natural language description of the translation intent"
      public? true
    end
  end

  relationships do
    belongs_to :source_value_set, Chironium.Terminology.ValueSet do
      description "Optional source value set scope for the mapping"
      public? true
    end

    belongs_to :target_value_set, Chironium.Terminology.ValueSet do
      description "Optional target value set scope for the mapping"
      public? true
    end

    has_many :entries, Chironium.Terminology.ConceptMapEntry do
      description "Explicit source-to-target concept mappings"
      public? true
    end
  end

  identities do
    identity :unique_url_version, [:url, :version]
  end
end
