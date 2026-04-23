defmodule Chironium.Datatypes.Age.Unit do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-age-units.html
  """

  use Ash.Type.Enum,
    values: [
      min: "minutes",
      h: "hours",
      d: "days",
      wk: "weeks",
      mo: "months",
      a: "years"
    ]

  def graphql_type(_), do: :age_unit
end
