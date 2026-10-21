defmodule Chironium.CRM.Checks.PersonVisibleToActor do
  @moduledoc """
  Filter check that restricts persons to those associated with patients visible to the actor.

  Used for direct `listPersons` queries, where `AccessedFromRelationship` does not apply.
  Produces a fully DB-side EXISTS chain: person → patient → active care team → active participant
  held by one of the actor's granted practitioner IDs.

  Power users bypass this check entirely via the `PowerUser` bypass on the Person resource.
  Non-practitioner actors that reach this check see nothing (consistent with patient visibility).
  """

  use Ash.Policy.FilterCheck

  @impl true
  def describe(_opts), do: "person is associated with a visible patient"

  @impl true
  def filter(%{__struct__: Chironium.Health.Practitioner} = practitioner, _authorizer, _opts) do
    practitioner_ids = practitioner.__metadata__[:practitioner_ids] || [practitioner.id]

    expr(
      exists(
        patients,
        exists(
          care_teams,
          status == :active and
            exists(participants, active == true and practitioner_id in ^practitioner_ids)
        )
      )
    )
  end

  def filter(_, _, _), do: false
end
