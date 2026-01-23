defmodule Chironium.Workers.TokenCleanupWorker do
  @moduledoc """
  Oban worker that periodically cleans up expired authentication tokens.

  Runs daily to remove tokens past their expiration date, preventing
  database bloat from accumulated expired tokens.

  ## Schedule

  Configured via Oban.Plugins.Cron to run once daily at 3 AM UTC.
  """
  use Oban.Worker,
    queue: :default,
    max_attempts: 3,
    unique: [period: :timer.hours(12)]

  require Logger

  @impl Oban.Worker
  def perform(_job) do
    Logger.info("Starting expired token cleanup")

    case cleanup_expired_tokens() do
      {:ok, count} ->
        Logger.info("Token cleanup complete: #{count} expired tokens removed")
        :ok

      {:error, reason} ->
        Logger.error("Token cleanup failed: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp cleanup_expired_tokens do
    # Use the Token resource's expunge_expired action.
    case Ash.bulk_destroy(
           Chironium.Core.Identity.Token,
           :expunge_expired,
           %{},
           authorize?: false,
           return_errors?: true
         ) do
      %Ash.BulkResult{status: :success, records: records} ->
        {:ok, length(records || [])}

      %Ash.BulkResult{status: :error, errors: errors} ->
        {:error, errors}
    end
  end
end
