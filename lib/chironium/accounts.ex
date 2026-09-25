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
      Chironium.Accounts.PrincipalGrant,
      Chironium.Accounts.Invitation,
      Chironium.Accounts.User,
      Chironium.Accounts.UserIdentity
    ]
  end

  paper_trail do
    include_versions? true
  end

  resources do
    resource Chironium.Accounts.Invitation do
      define :accept_invitation, args: [:invite_code], action: :accept_by_invite_code
      define :reject_invitation, args: [:invite_code], action: :reject_by_invite_code
      define :find_current_email_invitations, args: [], action: :current_email_invitation
    end

    resource Chironium.Accounts.GuestAccess
    resource Chironium.Accounts.Organization
    resource Chironium.Accounts.OrganizationUsers
    resource Chironium.Accounts.PrincipalGrant
    resource Chironium.Accounts.Token
    resource Chironium.Accounts.User
    resource Chironium.Accounts.UserIdentity
  end
end
