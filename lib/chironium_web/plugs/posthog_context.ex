defmodule ChironiumWeb.Plugs.PostHogContext do
  @moduledoc """
  Sets PostHog request context, except on patient-link routes.

  `PostHog.Integrations.Plug` records the full URL, and on those routes the
  query string can carry a sign-in token. Patients are not tracked at all.
  """

  @behaviour Plug

  @impl true
  def init(opts), do: PostHog.Integrations.Plug.init(opts)

  @impl true
  def call(%Plug.Conn{path_info: ["portal" | _]} = conn, _opts), do: conn
  def call(%Plug.Conn{path_info: ["auth", "guest" | _]} = conn, _opts), do: conn
  def call(conn, opts), do: PostHog.Integrations.Plug.call(conn, opts)
end
