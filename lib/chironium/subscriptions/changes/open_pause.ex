defmodule Chironium.Subscriptions.Changes.OpenPause do
  @moduledoc """
  After-action change that opens a new `SubscriptionPause` record when a
  subscription transitions to the `:suspended` state.

  Reads the `:suspended_at` and `:reason` arguments from the changeset to
  populate the pause record.
  """

  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.after_action(changeset, fn cs, subscription ->
      reason = Ash.Changeset.get_argument(changeset, :reason)
      start_date = Ash.Changeset.get_argument(changeset, :suspended_at)

      Chironium.Subscriptions.SubscriptionPause
      |> Ash.Changeset.for_create(
        :open,
        %{subscription_id: subscription.id, start_date: start_date, reason: reason},
        authorize?: false,
        actor: cs.context[:private][:actor],
        tenant: cs.tenant
      )
      |> Ash.create!()

      {:ok, subscription}
    end)
  end
end
