defmodule ChironiumWeb.Plugs.PostHogContext do
  @moduledoc """
  Sets PostHog request context, except on patient-link routes.

  `PostHog.Integrations.Plug` records the full URL, and on those routes the
  query string can carry a sign-in token. Patients are not tracked at all.
  Elsewhere, invite codes are masked in the recorded URL, as the browser
  client does (`posthog-client.ts`).
  """

  @behaviour Plug

  # Invite codes are credentials: invitees land on `/app?inviteCode=…`. Also
  # matches the URL-encoded form inside a nested return URL.
  @invite_code_param ~r/(inviteCode(?:=|%3D))[^&#%\s]*/i

  @impl true
  def init(opts), do: PostHog.Integrations.Plug.init(opts)

  @impl true
  def call(%Plug.Conn{path_info: ["portal" | _]} = conn, _opts), do: conn
  def call(%Plug.Conn{path_info: ["auth", "guest" | _]} = conn, _opts), do: conn

  # The integration only stores context for this process, so the masked copy
  # never reaches the rest of the pipeline.
  def call(conn, opts) do
    masked = %{conn | query_string: mask_invite_codes(conn.query_string)}
    PostHog.Integrations.Plug.call(masked, opts)
    conn
  end

  defp mask_invite_codes(query_string),
    do: Regex.replace(@invite_code_param, query_string, "\\1<MASKED>")
end
