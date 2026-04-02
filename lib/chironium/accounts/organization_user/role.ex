defmodule Chironium.Accounts.OrganizationUser.Role do
  use Ash.Type.Enum,
    values: [
      :power_user,
      :member
    ]

  def graphql_type(_), do: :organization_user_role
end
