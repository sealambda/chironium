defmodule Chironium.Health.Checks.PatientVisibleToActor do
  @moduledoc """
  Filter check that restricts patients to those the acting practitioner can see.

  A practitioner sees patients whose active CareTeam includes any of their
  granted practitioners (IDs stored in `:practitioner_ids` metadata).

  Non-practitioner actors that bypass this check (power users) are handled by
  a separate bypass policy. All other actor types see nothing.
  """

  use Ash.Policy.FilterCheck

  require Ash.Query

  @impl true
  def describe(_opts), do: "patient is in actor's active care teams"

  @impl true
  def filter(%{__struct__: Chironium.Health.Practitioner} = practitioner, _authorizer, _opts) do
    practitioner_ids = practitioner.__metadata__[:practitioner_ids] || [practitioner.id]

    expr(
      exists(
        care_teams,
        status == :active and
          exists(participants, active == true and practitioner_id in ^practitioner_ids)
      )
    )
  end

  # Non-practitioner actors that reach this check (not caught by bypass) see nothing.
  def filter(_, _, _), do: false
end
