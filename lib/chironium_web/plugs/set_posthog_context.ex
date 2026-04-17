defmodule ChironiumWeb.Plugs.SetPosthogContext do
  @moduledoc """
  Sets PostHog request context from the authenticated user.

  This keeps backend captures aligned with the frontend identify call, which
  uses the User ID as `distinct_id`.
  """

  @behaviour Plug

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    case conn.assigns[:current_user] do
      %{id: user_id} when is_binary(user_id) and user_id != "" ->
        PostHog.set_context(%{distinct_id: user_id})
        conn

      _ ->
        conn
    end
  end
end
