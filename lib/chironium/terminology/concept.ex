defmodule Chironium.Terminology.Concept do
  @moduledoc """
  The anchor for every clinical idea. Stores only the structural identity;
  all human-readable text lives in `Chironium.Terminology.Designation`.
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
    table "concepts"
  end

  graphql do
    type :concept

    queries do
      list :list_concepts, :read
      read_one :get_concept, :read
      list :search_concepts, :search
    end
  end

  actions do
    defaults [:read]

    read :search do
      description "Search active concepts by designation text and optional system filters."
      pagination default_limit: 10, keyset?: true

      argument :text, :string do
        allow_nil? false
      end

      argument :context, Chironium.Terminology.Concept.ConceptContext do
        description "Restricts results to descendants of a well-known root concept (e.g. CONDITION, MEDICATION)."
        allow_nil? true
      end

      prepare Chironium.Terminology.Concept.FilterByContext

      filter expr(
               active == true and
                 fragment(
                   """
                   EXISTS (
                     SELECT 1
                     FROM designations d
                     WHERE d.concept_id = ?
                       AND d.value % ?
                   )
                   """,
                   id,
                   ^arg(:text)
                 )
             )
    end
  end

  # TODO: Add policies
  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :code, :string do
      description "Terminology-native identifier, e.g. '763158003'"
      public? true
      allow_nil? false
    end

    attribute :active, :boolean do
      description "Whether the concept is active in the source terminology release"
      public? true
      allow_nil? false
      default true
    end
  end

  relationships do
    belongs_to :code_system, Chironium.Terminology.CodeSystem do
      description "Code system this concept belongs to"
      public? true
      allow_nil? false
    end

    has_many :designations, Chironium.Terminology.Designation do
      description "Designations for the concept"
      public? true
    end

    has_many :ancestor_closures, Chironium.Terminology.ConceptClosure do
      description "Closure rows where this concept is the descendant, enabling ancestor traversal."
      source_attribute :id
      destination_attribute :child_id
    end
  end

  identities do
    identity :code_system_and_code, [:code_system_id, :code]
  end
end
