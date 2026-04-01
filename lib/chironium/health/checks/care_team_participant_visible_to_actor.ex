defmodule Chironium.Health.Checks.CareTeamParticipantVisibleToActor do
  @moduledoc """
  Filter check that restricts care team participants to those in care teams
  the acting practitioner participates in.

  A practitioner sees participants only in active care teams that include at
  least one of their granted practitioners (`practitioner_ids` metadata).

  Power users (org owners / `power_user` role) bypass this check via a
  separate `bypass` policy on `CareTeamParticipant`.
  """

  use Ash.Policy.FilterCheck

  @impl true
  def describe(_opts), do: "participant belongs to a care team the actor is part of"

  @impl true
  def filter(%Chironium.Health.Practitioner{} = practitioner, _authorizer, _opts) do
    practitioner_ids = practitioner.__metadata__[:practitioner_ids] || [practitioner.id]

    expr(
      care_team.status == :active and
        exists(
          care_team.participants,
          active == true and practitioner_id in ^practitioner_ids
        )
    )
  end

  # Non-practitioner actors that reach this check see nothing.
  def filter(_, _, _), do: false
end
