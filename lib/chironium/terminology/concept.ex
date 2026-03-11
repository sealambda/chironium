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
      list :search_concepts_in_closure, :search_in_closure
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

    read :search_in_closure do
      description "Search active concepts by designation text constrained by an ancestor code."
      pagination default_limit: 20, keyset?: true

      argument :text, :string do
        allow_nil? false
      end

      argument :ancestor_code, :string do
        allow_nil? false
      end

      argument :system, :string do
        allow_nil? true
      end

      argument :version, :string do
        allow_nil? true
      end

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
                 ) and
                 fragment(
                   """
                   ? IN (
                     SELECT cc.child_id
                     FROM concept_closures cc
                     JOIN concepts ancestor ON ancestor.id = cc.parent_id
                     WHERE ancestor.code = ?
                       AND ancestor.code_system_id = ?
                   )
                   """,
                   id,
                   ^arg(:ancestor_code),
                   code_system_id
                 ) and
                 (is_nil(arg(:system)) or
                    fragment(
                      "EXISTS (SELECT 1 FROM code_systems cs WHERE cs.id = ? AND cs.url = ?)",
                      code_system_id,
                      ^arg(:system)
                    )) and
                 (is_nil(arg(:version)) or
                    fragment(
                      "EXISTS (SELECT 1 FROM code_systems cs WHERE cs.id = ? AND cs.version = ?)",
                      code_system_id,
                      ^arg(:version)
                    ))
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
  end

  identities do
    identity :code_system_and_code, [:code_system_id, :code]
  end
end
