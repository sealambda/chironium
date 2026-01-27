defmodule ChironiumWeb.Api.Graphql.Socket do
  @moduledoc """
  Phoenix socket for GraphQL subscriptions.

  Provides WebSocket support for Absinthe subscriptions.
  """
  use Phoenix.Socket

  use Absinthe.Phoenix.Socket,
    schema: ChironiumWeb.Api.Graphql.Schema

  @impl true
  def connect(_params, socket, _connect_info) do
    {:ok, socket}
  end

  @impl true
  def id(_socket), do: nil
end
