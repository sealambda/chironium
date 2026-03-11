defmodule Chironium.Terminology.ValueSet do
  @moduledoc """
  Stores reusable subsets of concepts for validation and expansion.

  This first pass keeps the model intentionally simple: canonical metadata plus
  explicit concept memberships. Full FHIR `compose` semantics can be layered on later.
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
    table "value_sets"
  end

  graphql do
    type :value_set
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
    attribute :url, :string do
      description "Canonical identifier for this value set, represented as a URI"
      public? true
      allow_nil? false
    end

    attribute :version, :string do
      description "Business version of the value set"
      public? true
    end

    attribute :name, :string do
      description "Computer-friendly identifier for this value set"
      public? true
    end

    attribute :title, :string do
      description "Human-friendly title for this value set"
      public? true
    end

    attribute :status, Chironium.Datatypes.PublicationStatus do
      description "Lifecycle status aligned with FHIR-style ValueSet metadata"
      public? true
      allow_nil? false
    end

    attribute :description, :string do
      description "Natural language description of the value set"
      public? true
    end
  end

  relationships do
    has_many :memberships, Chironium.Terminology.ValueSetMembership do
      description "Explicit memberships that define which concepts belong to the value set"
      public? true
    end

    many_to_many :concepts, Chironium.Terminology.Concept do
      description "Concepts included in this value set"
      public? true
      through Chironium.Terminology.ValueSetMembership
      source_attribute_on_join_resource :value_set_id
      destination_attribute_on_join_resource :concept_id
    end
  end

  identities do
    identity :unique_url_version, [:url, :version]
  end
end
