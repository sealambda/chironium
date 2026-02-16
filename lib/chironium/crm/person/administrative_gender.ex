defmodule Chironium.CRM.Person.AdministrativeGender do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-administrative-gender.html
  """

  use Ash.Type.Enum,
    values: [
      male: "Male",
      female: "Female",
      other: "Other",
      unknown: "Unknown"
    ]

  def graphql_type(_), do: :administrative_gender
end
