defmodule Chironium.Automation.Workers.RunRuleAction do
  @moduledoc false

  use Oban.Worker, queue: :default, max_attempts: 5

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"rule_id" => rule_id, "tenant_id" => tenant_id} = args}) do
    opts = [authorize?: false]

    Chironium.Automation.ExecutionLog
    |> Ash.Changeset.for_create(
      :create,
      %{
        rule_id: rule_id,
        status: :success,
        error_details: nil
      },
      opts
    )
    |> Ash.create()

    Logger.info("[Automation] Executed rule #{rule_id} for tenant #{tenant_id}: #{inspect(args)}")
    :ok
  rescue
    exception ->
      Logger.error("[Automation] Rule execution failed for #{rule_id}: #{Exception.message(exception)}")
      {:error, exception}
  end
end
