defmodule Chironium.Accounts.PrincipalType do
  @moduledoc """
  Enumerates the kinds of clinical principal a user can be granted access as.
  """

  use Ash.Type.Enum,
    values: [
      practitioner: "Practitioner",
      patient: "Patient"
    ]

  def graphql_type(_), do: :principal_type

  @principal_resources %{
    practitioner: Chironium.Health.Practitioner,
    patient: Chironium.Health.Patient
  }

  @doc "Returns the Ash resource module for the given principal type atom."
  def resource_for!(type) do
    Map.fetch!(@principal_resources, type)
  end
end
