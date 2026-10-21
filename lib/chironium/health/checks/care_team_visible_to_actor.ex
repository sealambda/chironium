defmodule Chironium.Health.Checks.CareTeamVisibleToActor do
  @moduledoc """
  Filter check that restricts care teams to those the acting practitioner participates in.

  A practitioner sees only active care teams in which at least one of their
  granted practitioners (`practitioner_ids` metadata) holds an active participation.

  Power users (org owners / `power_user` role) bypass this check via a
  separate `bypass` policy on `CareTeam`.
  """

  use Ash.Policy.FilterCheck

  @impl true
  def describe(_opts), do: "actor is an active participant in the care team"

  @impl true
  def filter(%{__struct__: Chironium.Health.Practitioner} = practitioner, _authorizer, _opts) do
    practitioner_ids = practitioner.__metadata__[:practitioner_ids] || [practitioner.id]

    expr(
      status == :active and
        exists(participants, active == true and practitioner_id in ^practitioner_ids)
    )
  end

  # Non-practitioner actors that reach this check see nothing.
  def filter(_, _, _), do: false
end
