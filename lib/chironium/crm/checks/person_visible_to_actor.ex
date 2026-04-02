defmodule Chironium.CRM.Checks.PersonVisibleToActor do
  @moduledoc """
  Filter check that restricts persons to those associated with patients visible to the actor.

  Used for direct `listPersons` queries, where `AccessedFromRelationship` does not apply.
  Issues a sub-query against `Chironium.Health.Patient` (authorized as the actor) to collect
  `person_id` values, then restricts this query to matching IDs.

  Power users bypass this check entirely via the `PowerUser` bypass on the Person resource.
  Non-practitioner actors that reach this check see nothing (consistent with patient visibility).
  """

  use Ash.Policy.FilterCheck

  @impl true
  def describe(_opts), do: "person is associated with a visible patient"

  @impl true
  def filter(actor, %{query: %Ash.Query{tenant: tenant}}, _opts)
      when not is_nil(tenant) do
    # Ash.stream! handles keyset-paginated actions without requiring a manual limit.
    person_ids =
      Chironium.Health.Patient
      |> Ash.Query.new()
      |> Ash.Query.set_tenant(tenant)
      |> Ash.Query.select([:person_id])
      |> Ash.stream!(actor: actor, authorize?: true)
      |> Stream.map(& &1.person_id)
      |> Stream.reject(&is_nil/1)
      |> Enum.to_list()

    expr(id in ^person_ids)
  end

  def filter(_, _, _), do: false
end
