defmodule Chironium.Subscriptions.Validations.ValidateSuspendedAt do
  @moduledoc """
  Validates the `:suspended_at` argument on the `:suspend` action:

  - Must not be before the subscription's `start_date`.
  - Must not be in the future.
  """

  use Ash.Resource.Validation

  @impl true
  def validate(changeset, _opts, _context) do
    suspended_at = Ash.Changeset.get_argument(changeset, :suspended_at)
    start_date = changeset.data.start_date
    today = Date.utc_today()

    cond do
      is_nil(suspended_at) ->
        :ok

      not is_nil(start_date) and Date.compare(suspended_at, start_date) == :lt ->
        {:error,
         field: :suspended_at,
         message: "cannot be before the subscription start date (%{start_date})",
         vars: [start_date: start_date]}

      Date.compare(suspended_at, today) == :gt ->
        {:error, field: :suspended_at, message: "cannot be in the future"}

      true ->
        :ok
    end
  end
end
