defmodule Chironium.Services do
  @moduledoc """
  Services domain - Service delivery management.

  This domain handles the connection between staff and customers:
  - Assignment: Links a membership (customer) to a contract (staff member)

  Assignments are the bridge that enables service delivery and is the
  parent entity for domain-specific records like health data.
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
    resource Chironium.Services.Assignment
  end
end
