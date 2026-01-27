defmodule Chironium.Customers do
  @moduledoc """
  Customers domain - Customer relationship management.

  This domain handles customer relationships with organisations:
  - Membership: Customer engagement lifecycle from lead to active customer

  Memberships follow a complex state machine tracking the full customer journey:
  LEAD -> ONBOARDING_PROFILE -> ONBOARDING_PAYMENT -> ACTIVE <-> PAUSED/FROZEN -> CHURNED/COMPLETED.
  """
  use Ash.Domain,
    otp_app: :chironium,
    extensions: [
      AshGraphql.Domain,
      AshAdmin.Domain
    ]

  admin do
    show? true
  end

  resources do
    resource Chironium.Customers.Membership
  end
end
