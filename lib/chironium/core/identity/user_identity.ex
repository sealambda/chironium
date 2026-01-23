defmodule Chironium.Core.Identity.UserIdentity do
  @moduledoc """
  Stores OAuth provider identities linked to users.

  Each user can have multiple identities from different OAuth providers
  (e.g., Google, GitHub). This resource tracks the provider-specific
  unique identifiers and tokens.
  """
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Core.Identity,
    data_layer: AshPostgres.DataLayer,
    extensions: [AshAuthentication.UserIdentity]

  user_identity do
    user_resource Chironium.Core.Identity.User
  end

  postgres do
    table "user_identities"
    repo Chironium.Repo

    identity_index_names unique_on_strategy_and_uid_and_user_id:
                           "user_identities_uid_strategy_idx"
  end
end
