defmodule Chironium.Subscriptions.Validations.ValidateResumedAt do
  @moduledoc """
  Validates the `:end_date` argument on the `:resume` action.

  When an open pause exists, `end_date` must be after the pause start date.
  """

  use Ash.Resource.Validation

  require Ash.Query

  @impl true
  def validate(changeset, _opts, _context) do
    resumed_at = Ash.Changeset.get_argument(changeset, :end_date)

    if is_nil(resumed_at) do
      :ok
    else
      validate_against_open_pause(changeset, resumed_at)
    end
  end

  defp validate_against_open_pause(changeset, resumed_at) do
    subscription = changeset.data

    open_pause =
      Chironium.Subscriptions.SubscriptionPause
      |> Ash.Query.filter(subscription_id == ^subscription.id and is_nil(end_date))
      |> Ash.read_one!(authorize?: false, tenant: changeset.tenant)

    case open_pause do
      nil ->
        :ok

      %{start_date: pause_start_date} ->
        if Date.compare(resumed_at, pause_start_date) == :gt do
          :ok
        else
          {:error,
           field: :end_date,
           message: "must be after the pause start date (%{pause_start_date})",
           vars: [pause_start_date: pause_start_date]}
        end
    end
  end
end
