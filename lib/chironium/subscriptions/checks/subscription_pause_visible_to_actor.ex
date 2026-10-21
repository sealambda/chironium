defmodule Chironium.Subscriptions.Checks.SubscriptionPauseVisibleToActor do
  @moduledoc """
  Filter check that restricts pause reads to those whose parent subscription
  is visible to the acting practitioner.

  Used for direct pause access, where `AccessedFromRelationship` does not apply.
  Mirrors `SubscriptionVisibleToActor` through the `subscription` relationship.
  """

  use Ash.Policy.FilterCheck

  @impl true
  def describe(_opts), do: "pause subscription is visible to the actor"

  @impl true
  def filter(%{__struct__: Chironium.Health.Practitioner} = practitioner, _authorizer, _opts) do
    practitioner_ids = practitioner.__metadata__[:practitioner_ids] || [practitioner.id]

    expr(
      exists(
        subscription,
        exists(
          subscriber,
          exists(
            patients,
            exists(
              care_teams,
              status == :active and
                exists(participants, active == true and practitioner_id in ^practitioner_ids)
            )
          )
        )
      )
    )
  end

  def filter(_, _, _), do: false
end
