defmodule Chironium.Terminology.CodeSystem do
  @moduledoc """
  Stores the metadata identity for each terminology: SNOMED CT, LOINC, RxNorm, or any local system.

  https://hl7.org/fhir/codesystem.html
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
    table "code_systems"
  end

  graphql do
    type :code_system
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
    attribute :url, :string do
      description "Canonical identifier for this code system, represented as a URI (globally unique) (Coding.system)"
      public? true
      allow_nil? false
    end

    attribute :version, :string do
      description "Business version of the code system (Coding.version)"
      public? true
    end

    attribute :name, :string do
      description "Name for this code system (computer friendly)"
      public? true
    end

    attribute :title, :string do
      description "	Name for this code system (human friendly)"
      public? true
    end

    attribute :status, Chironium.Datatypes.PublicationStatus do
      description "Lifecycle status aligned with FHIR-style CodeSystem metadata"
      public? true
      allow_nil? false
    end

    attribute :description, :string do
      description "Natural language description of the code system"
      public? true
    end

    attribute :content, Chironium.Terminology.CodeSystem.ContentMode do
      description "How complete this code system version is, e.g. complete or fragment"
      public? true
      allow_nil? false
    end
  end

  relationships do
    has_many :concepts, Chironium.Terminology.Concept do
      description "Concepts in the code system"
      public? true
    end
  end

  identities do
    identity :unique_url_version, [:url, :version]
  end
end
