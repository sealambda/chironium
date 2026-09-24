defmodule Chironium.Accounts.UserIdentity do
  @moduledoc """
  Stores OAuth provider identities linked to users.

  Each user can have multiple identities from different OAuth providers
  (e.g., Google, GitHub). This resource tracks the provider-specific
  unique identifiers and tokens.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Accounts,
    data_layer: AshPostgres.DataLayer,
    extensions: [AshAuthentication.UserIdentity],
    authorizers: [Ash.Policy.Authorizer]

  user_identity do
    user_resource Chironium.Accounts.User
  end

  postgres do
    table "user_identities"
    repo Chironium.Repo
  end

  # Identities hold OAuth tokens, so only AshAuthentication may touch them.
  policies do
    bypass AshAuthentication.Checks.AshAuthenticationInteraction do
      authorize_if always()
    end
  end
end
