defmodule Chironium.Datatypes.Duration.Unit do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-duration-units.html
  """

  use Ash.Type.Enum,
    values: [
      ms: "milliseconds",
      s: "seconds",
      min: "minutes",
      h: "hours",
      d: "days",
      wk: "weeks",
      mo: "months",
      a: "years"
    ]

  def graphql_type(_), do: :duration_unit
end
