defmodule Chironium.Core.Identity do
  @moduledoc """
  Identity sub-domain - Authentication and authorization.

  This sub-domain handles:
  - User: The authenticated account (via Ash Authentication)
  - Token: JWT tokens for authentication
  - UserIdentity: OAuth provider identities
  - AuthEvent: Audit log for authentication events

  Uses Ash Framework standard naming conventions for authentication resources.
  """
  use Ash.Domain,
    otp_app: :chironium,
    extensions: [
      AshGraphql.Domain,
      AshAdmin.Domain,
      AshPaperTrail.Domain
    ]

  admin do
    show? true
  end

  paper_trail do
    # Automatically include all version resources in the domain.
    include_versions?(true)
  end

  resources do
    resource Chironium.Core.Identity.User
    resource Chironium.Core.Identity.Token
    resource Chironium.Core.Identity.UserIdentity
    resource Chironium.Core.Identity.AuthEvent
  end
end
