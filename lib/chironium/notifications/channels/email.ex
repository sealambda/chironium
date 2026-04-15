defmodule Chironium.Notifications.Channels.Email do
  @moduledoc """
  Email delivery channel. Enqueues an Oban job for async sending.
  """

  alias Chironium.Workers.NotificationEmailWorker

  @doc "Enqueue an email notification for delivery."
  @spec deliver(atom(), map()) :: :ok
  def deliver(event, params) when is_atom(event) do
    %{type: Atom.to_string(event), params: stringify_keys(params)}
    |> NotificationEmailWorker.new()
    |> Oban.insert!()

    :ok
  end

  # Oban serializes args as JSON, so keys must be strings.
  defp stringify_keys(map) do
    Map.new(map, fn {k, v} -> {to_string(k), v} end)
  end
end
