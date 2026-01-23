defmodule Chironium.Core do
  @moduledoc """
  Core domain - Foundation entities for the CRM system.

  This domain contains fundamental entities that all other domains depend on:
  - Organisation: The business entity / tenant
  - Person: Universal identity for any individual (staff, clients, etc.)
  - PersonProfile: Per-organisation profile preferences

  The Identity sub-domain handles authentication concerns separately.
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
    resource Chironium.Core.Organisation
    resource Chironium.Core.Person
    resource Chironium.Core.PersonProfile
  end
end
