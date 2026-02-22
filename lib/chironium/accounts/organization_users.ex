defmodule Chironium.Accounts.OrganizationUsers do
  @moduledoc """
  Public-schema join table for organization access control.

  Determines which organizations a user can access and with what roles.
  One row per (organization, user) pair.
  """
  use Chironium.BaseResources.Auditable,
    otp_app: :chironium,
    domain: Chironium.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer, AshPaperTrail.Resource]

  postgres do
    table "organization_users"
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  policies do
    # Allow AshAuthentication to perform its operations.
    bypass AshAuthentication.Checks.AshAuthenticationInteraction do
      authorize_if always()
    end
  end

  relationships do
    belongs_to :organization, Chironium.Accounts.Organization do
      allow_nil? false
      public? true
    end

    belongs_to :user, Chironium.Accounts.User do
      allow_nil? false
      public? true
    end
  end

  identities do
    identity :unique_organization_user, [:organization_id, :user_id]
  end
end
