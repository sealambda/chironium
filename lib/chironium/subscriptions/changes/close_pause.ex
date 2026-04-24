defmodule Chironium.Subscriptions.Changes.ClosePause do
  @moduledoc """
  Before-action change that closes the currently open `SubscriptionPause` (if
  any) by setting its `end_date`.

  Used by both the `:resume` and `:cancel` actions. Both actions provide an
  `:end_date` argument; it defaults to `Date.utc_today/0` when absent.

  When no open pause exists (e.g., canceling a subscription that was never
  suspended) the changeset passes through unchanged.
  """

  use Ash.Resource.Change

  require Ash.Query

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, fn changeset ->
      subscription = changeset.data

      end_date =
        Ash.Changeset.get_argument(changeset, :end_date) || Date.utc_today()

      open_pause =
        Chironium.Subscriptions.SubscriptionPause
        |> Ash.Query.filter(subscription_id == ^subscription.id and is_nil(end_date))
        |> Ash.read_one!(authorize?: false, tenant: changeset.tenant)

      case open_pause do
        nil ->
          changeset

        pause ->
          pause
          |> Ash.Changeset.for_update(:close, %{end_date: end_date},
            authorize?: false,
            tenant: changeset.tenant
          )
          |> Ash.update!()

          changeset
      end
    end)
  end
end
