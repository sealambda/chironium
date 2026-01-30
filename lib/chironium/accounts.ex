defmodule Chironium.Accounts do
  use Ash.Domain,
    otp_app: :chironium,
    extensions: [
      AshGraphql.Domain,
      AshAdmin.Domain,
      AshPaperTrail.Domain
    ]

  admin do
    show? true

    show_resources [
      Chironium.Accounts.Organization,
      Chironium.Accounts.User,
      Chironium.Accounts.UserIdentity
    ]
  end

  paper_trail do
    include_versions? true
  end

  resources do
    resource Chironium.Accounts.Organization
    resource Chironium.Accounts.OrganizationUsers
    resource Chironium.Accounts.Token
    resource Chironium.Accounts.User
    resource Chironium.Accounts.UserIdentity
  end
end
