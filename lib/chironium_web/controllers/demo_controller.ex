defmodule ChironiumWeb.DemoController do
  @moduledoc "Starts a public demo: a throwaway user who owns a seeded organization."

  use ChironiumWeb, :controller

  alias Chironium.Accounts.Organization
  alias Chironium.Accounts.User
  alias Chironium.Demo
  alias ChironiumWeb.Plugs.PortalRateLimit
  alias ChironiumWeb.SessionSignIn

  @hour_ms 60 * 60 * 1000

  # Remembers the visitor's demo user. Signing out clears only the session, so a
  # visitor who signs out and clicks "Try the demo" again gets the same demo.
  # Signed, so it can't name another visitor's demo; it lasts as long as a demo.
  @demo_cookie "chironium_demo"
  # Evaluated at compile time: releases don't include Mix.
  @demo_cookie_opts [
    sign: true,
    max_age: 24 * 60 * 60,
    http_only: true,
    same_site: "Lax",
    secure: Mix.env() == :prod
  ]

  # Routes compile before runtime config, so the route always exists.
  plug :require_demo_mode

  def create(conn, _params) do
    conn = fetch_cookies(conn, signed: [@demo_cookie])

    case returning_user(conn) do
      nil -> limit_starts(conn)
      user -> enter(conn, user)
    end
  end

  # Only new demos count, so a visitor returning to their demo never hits the limit.
  defp limit_starts(conn) do
    key = {:demo_start, network(PortalRateLimit.client_ip(conn))}

    case ChironiumWeb.RateLimit.hit(key, @hour_ms, Demo.config(:starts_per_network)) do
      {:allow, _count} ->
        start(conn)

      {:deny, _retry_after_ms} ->
        back_to_sign_in(
          conn,
          gettext("Too many demos were started from your network. Please try again in an hour.")
        )
    end
  end

  # One IPv6 visitor usually gets a whole /64, so the /64 counts as one address.
  defp network(ip) do
    case :inet.parse_address(String.to_charlist(ip)) do
      {:ok, {a, b, c, d, _, _, _, _}} -> :inet.ntoa({a, b, c, d, 0, 0, 0, 0}) |> to_string()
      _ -> ip
    end
  end

  # The signed-in demo user, or the one the cookie remembers, while their demo exists.
  defp returning_user(conn) do
    user = conn.assigns[:current_user] || remembered_user(conn.cookies[@demo_cookie])

    if user && Demo.demo_user?(user) && Ash.exists?(Organization, actor: user), do: user
  end

  defp remembered_user(id) when is_binary(id) do
    case Ash.get(User, id, authorize?: false) do
      {:ok, user} -> user
      {:error, _} -> nil
    end
  end

  defp remembered_user(_id), do: nil

  defp start(conn) do
    case Demo.start() do
      {:ok, user} ->
        enter(conn, user)

      {:error, :full} ->
        back_to_sign_in(conn, gettext("The demo is full right now. Please try again later."))

      _error ->
        back_to_sign_in(conn, gettext("Couldn't start the demo. Please try again."))
    end
  end

  defp enter(conn, user) do
    case SessionSignIn.sign_in(conn, user) do
      {:ok, conn} ->
        conn
        |> put_resp_cookie(@demo_cookie, user.id, @demo_cookie_opts)
        |> redirect(to: ~p"/app")

      :error ->
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
