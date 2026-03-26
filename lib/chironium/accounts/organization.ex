defmodule Chironium.Accounts.Organization do
  @moduledoc """
  Represents a business organization in the system.

  Organizations are the top-level tenant entity.
  """
  use Chironium.BaseResources.Auditable,
    otp_app: :chironium,
    domain: Chironium.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource]

  postgres do
    table "organizations"

    manage_tenant do
      template ["org_", :id]
    end
  end

  graphql do
    type :organization

    queries do
      get :get_organization, :read
      list :list_organizations, :read
    end

    mutations do
      create :create_organization, :create
      update :invite_users_to_organization, :invite_users
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:organization]}
  end

  actions do
    defaults [:read, :destroy, update: [:name, :slug]]

    create :create do
      accept [:name, :slug]
      change relate_actor(:owner)
    end

    update :invite_users do
      argument :invitations, {:array, :map} do
        allow_nil? false
      end

      change manage_relationship(:invitations, type: :create)
    end
  end

  policies do
    policy action(:create) do
      description "Authenticated users can create organisations."
      authorize_if actor_present()
    end

    policy action_type(:update) do
      authorize_if relates_to_actor_via(:owner)
    end

    policy action_type(:read) do
      authorize_if relates_to_actor_via(:owner)
      authorize_if relates_to_actor_via(:users)
    end
  end

  attributes do
    attribute :name, :string do
      allow_nil? false
      public? true
      constraints max_length: 64
    end

    attribute :slug, :ci_string do
      allow_nil? false
      public? true
      constraints match: ~r/^[a-z0-9]+(-[a-z0-9]+)*$/, casing: :lower, max_length: 64
    end
  end

  relationships do
    belongs_to :owner, Chironium.Accounts.User do
      description "The organization must belong to an owner, usually who created it"
      allow_nil? false
      public? true
    end

    many_to_many :users, Chironium.Accounts.User do
      description "All other users belonging to the organization are defined separately"
      through Chironium.Accounts.OrganizationUsers
      source_attribute_on_join_resource :organization_id
      destination_attribute_on_join_resource :user_id
      public? true
    end

    has_many :invitations, Chironium.Accounts.Invitation do
      description "Invitations to join the organization"
      public? true
    end
  end

  identities do
    identity :unique_slug, [:slug]
  end
end
