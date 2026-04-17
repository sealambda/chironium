defmodule Chironium.Subscriptions.Checks.SubscriptionVisibleToActor do
  @moduledoc """
  Filter check that restricts subscriptions to those whose subscriber is a
  patient in an active care team that the acting practitioner participates in.

  Used for direct `listSubscriptions` queries, where `AccessedFromRelationship`
  does not apply (e.g., the customers list on the web app). Produces a
  fully DB-side EXISTS chain: subscription → subscriber → patient → active
  care team → active participant held by one of the actor's granted
  practitioner IDs.

  Power users bypass this check entirely via the `PowerUser` bypass on the
  Subscription resource. Non-practitioner actors that reach this check see
  nothing (consistent with patient visibility).
  """

  use Ash.Policy.FilterCheck

  @impl true
  def describe(_opts), do: "subscription subscriber is associated with a visible patient"

  @impl true
  def filter(%Chironium.Health.Practitioner{} = practitioner, _authorizer, _opts) do
    practitioner_ids = practitioner.__metadata__[:practitioner_ids] || [practitioner.id]

    expr(
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
  end

  def filter(_, _, _), do: false
end
