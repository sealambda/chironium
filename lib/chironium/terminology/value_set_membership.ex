defmodule Chironium.Terminology.ValueSetMembership do
  @moduledoc """
  Join resource for explicit value set memberships.
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
    table "value_set_memberships"
  end

  graphql do
    type :value_set_membership
  end

  actions do
    defaults [:read]
  end

  policies do
    policy always() do
      authorize_if always()
    end
  end

  relationships do
    belongs_to :value_set, Chironium.Terminology.ValueSet do
      description "Value set that includes the concept"
      public? true
      allow_nil? false
    end

    belongs_to :concept, Chironium.Terminology.Concept do
      description "Concept explicitly included in the value set"
      public? true
      allow_nil? false
    end
  end

  identities do
    identity :value_set_and_concept, [:value_set_id, :concept_id]
  end
end
