defmodule Chironium.Staff do
  @moduledoc """
  Staff domain - Workforce management.

  This domain handles staff relationships with organisations:
  - Contract: Employment/contractor relationship with roles and states

  Roles include OWNER, MANAGER, STAFF, and SALES.
  Contracts follow a state machine: PENDING -> ACTIVE <-> PAUSED -> COMPLETED/TERMINATED.
  """
  use Ash.Domain,
    otp_app: :chironium,
    extensions: [
      AshJsonApi.Domain,
      AshGraphql.Domain,
      AshAdmin.Domain
    ]

  admin do
    show? true
  end

  resources do
    resource Chironium.Staff.Contract
  end
end
