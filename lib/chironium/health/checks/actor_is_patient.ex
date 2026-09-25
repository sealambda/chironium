defmodule Chironium.Health.Checks.ActorIsPatient do
  @moduledoc """
  Authorizes a `%Patient{}` actor, as resolved for the patient portal.

  Scope metadata (`:scope`) narrows what the patient may reach; see
  `TaskVisibleToPatient`.
  """

  use Ash.Policy.SimpleCheck

  @impl true
  def describe(_opts), do: "actor is a patient"

  @impl true
  def match?(%Chironium.Health.Patient{}, _context, _opts), do: true
  def match?(_actor, _context, _opts), do: false
end
