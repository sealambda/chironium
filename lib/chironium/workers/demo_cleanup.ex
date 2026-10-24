defmodule Chironium.Workers.DemoCleanup do
  @moduledoc """
  Deletes demo organizations and users older than 24 hours. Runs hourly in demo
  mode; see `Chironium.Demo.Cleanup` for which records are due.
  """

  use Oban.Worker, queue: :default

  require Logger

  alias Chironium.Demo
  alias Chironium.Demo.Cleanup

  # Checked here, not only in the crontab, so a job enqueued by hand on a normal
  # instance deletes nothing.
  @impl true
  def perform(%Oban.Job{}) do
    if Demo.enabled?(), do: clean_up(), else: {:cancel, "Demo mode is off."}
  end

  # Organizations go first: deleting them is what leaves their users due.
  defp clean_up do
    organizations = Enum.count(Cleanup.due_organizations(), &delete_organization/1)
    users = Enum.count(Cleanup.due_users(), &delete_user/1)
    Logger.info("[DemoCleanup] Deleted #{organizations} organizations and #{users} users.")
    :ok
  end

  # One failed organization must not stop the rest; it is retried on the next run.
  defp delete_organization(id) do
    Cleanup.delete_organization(id) == :ok
  rescue
    error ->
      Logger.error("[DemoCleanup] Kept organization #{id}: #{Exception.message(error)}")
      false
  end

  defp delete_user(id) do
    case Cleanup.delete_user(id) do
      :ok ->
        true

      {:error, constraint} ->
        Logger.warning("[DemoCleanup] Kept user #{id}: still referenced by #{constraint}.")
        false
    end
  end
end
