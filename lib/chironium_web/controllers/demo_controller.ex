defmodule ChironiumWeb.DemoController do
  @moduledoc "Starts a public demo: a throwaway user who owns a seeded organization."

  use ChironiumWeb, :controller

  alias Chironium.Demo
  alias ChironiumWeb.Plugs.PortalRateLimit
  alias ChironiumWeb.SessionSignIn

  # Routes compile before runtime config, so the route always exists.
  plug :require_demo_mode

  @hour_ms 3_600_000

  def create(conn, _params) do
    user = conn.assigns[:current_user]

    if user && Demo.demo_user?(user) && Ash.exists?(Chironium.Accounts.Organization, actor: user) do
      redirect(conn, to: ~p"/app")
    else
      ip = PortalRateLimit.client_ip(conn)

      case ChironiumWeb.RateLimit.hit({:demo, ip}, @hour_ms, Demo.config(:starts_per_ip)) do
        {:allow, _count} ->
          start(conn)

        {:deny, _retry_after_ms} ->
          message =
            gettext("Too many demos were started from your network. Please try again in an hour.")

          back_to_sign_in(conn, message)
      end
    end
  end

  defp start(conn) do
    with {:ok, user} <- Demo.start(),
         {:ok, conn} <- SessionSignIn.sign_in(conn, user) do
      redirect(conn, to: ~p"/app")
    else
      {:error, :full} ->
        back_to_sign_in(conn, gettext("The demo is full right now. Please try again later."))

      _error ->
        back_to_sign_in(conn, gettext("Couldn't start the demo. Please try again."))
    end
  end

  defp back_to_sign_in(conn, message) do
    conn |> put_flash(:error, message) |> redirect(to: ~p"/sign-in")
  end

  defp require_demo_mode(conn, _opts) do
    if Demo.enabled?(), do: conn, else: conn |> send_resp(:not_found, "Not Found") |> halt()
  end
end
