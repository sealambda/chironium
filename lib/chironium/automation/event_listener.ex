defmodule Chironium.Automation.EventListener do
  @moduledoc false

  use GenServer

  require Logger
  require Ash.Query

  @subscription_topic "automation:events"

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl GenServer
  def init(_opts) do
    Phoenix.PubSub.subscribe(Chironium.PubSub, @subscription_topic)
    {:ok, %{subscription_topic: @subscription_topic}}
  end

  @impl GenServer
  def handle_info(%Phoenix.Socket.Broadcast{} = broadcast, state) do
    handle_event_broadcast(broadcast)
    {:noreply, state}
  end

  def handle_info(_message, state), do: {:noreply, state}

  defp handle_event_broadcast(%Phoenix.Socket.Broadcast{event: event, payload: payload}) do
    tenant_id = payload_tenant(payload)

    Logger.info("[Automation] Received event #{event} for tenant #{inspect(tenant_id)}")

    rule_query =
      Chironium.Automation.Rule
      |> Ash.Query.for_read(:read)
      |> Ash.Query.filter(
        trigger_type == :domain_event and trigger_topic == ^event and is_active == true and
          tenant_id == ^tenant_id
      )

    case Ash.read(rule_query, authorize?: false) do
      {:ok, rules} ->
        Enum.each(rules, fn rule ->
          %{rule_id: rule.id, tenant_id: tenant_id, event: event}
          |> Chironium.Automation.Workers.RunRuleAction.new()
          |> Oban.insert()
        end)

      {:error, error} ->
        Logger.error("[Automation] Failed to load rules for event #{event}: #{inspect(error)}")
    end
  end

  # Ash.Notifier.Notification does not implement Access, so we must use
  # pattern matching to extract the tenant set on the changeset.
  defp payload_tenant(%Ash.Notifier.Notification{changeset: %{tenant: tenant}})
       when is_binary(tenant),
       do: tenant

  defp payload_tenant(%Ash.Notifier.Notification{}), do: "default"

  defp payload_tenant(payload) when is_map(payload) do
    payload[:tenant] || payload["tenant"] || "default"
  end

  defp payload_tenant(_payload), do: "default"
end
