# TODO Maybe a tagged union would be more effective
#      https://hexdocs.pm/ash/Ash.Type.Union.html
defmodule Chironium.CRM.ContactPoint.Type do
  use Ash.Type.Enum,
    values: [
      email: "Email address",
      phone: "Phone number",
      instagram: "Instagram username"
    ]

  def graphql_type(_), do: :contact_point_type
end
