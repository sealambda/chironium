defmodule Chironium.Accounts.PrincipalGrant do
  @moduledoc """
  Maps a user to a principal they are allowed to act as within an organization.

  Tenant-scoped: the organization context is implicit via multitenancy.
  The `user_id` column has no DB-level FK because it references `public.users`
  across schema boundaries. Integrity is enforced by the SetTenant plug, which
  verifies organization membership before any tenant-scoped operation.
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshAdmin.Resource, AshPaperTrail.Resource]

  admin do
    actor? true
  end

  postgres do
    table "principal_grants"

    references do
      # User lives in the public schema; skip the cross-schema FK constraint.
      reference :user, ignore?: true
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:principal_grant]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  policies do
    # Org owners and power-user-role members can manage all grants.
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    # Regular members may read only their own grants.
    policy action_type(:read) do
      authorize_if expr(user_id == ^actor(:id))
    end

    # No member may self-assign or modify grants; only power users (bypassed above) can.
    policy action([:create, :update, :destroy]) do
      forbid_if always()
    end
  end

  attributes do
    attribute :principal_type, :atom do
      allow_nil? false
      public? true
      constraints one_of: [:practitioner, :patient]
    end

    attribute :principal_id, :uuid do
      allow_nil? false
      public? true
    end

    attribute :active, :boolean do
      allow_nil? false
      public? true
      default true
    end
  end

  relationships do
    belongs_to :user, Chironium.Accounts.User do
      allow_nil? false
      public? true
    end
  end

  identities do
    identity :unique_user_principal_grant,
             [:user_id, :principal_type, :principal_id]
  end
end
