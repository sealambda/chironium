defmodule ChironiumWeb.DemoController do
  @moduledoc "Starts a public demo: a throwaway user who owns a seeded organization."

  use ChironiumWeb, :controller

  alias Chironium.Accounts.Organization
  alias Chironium.Accounts.User
  alias Chironium.Demo
  alias ChironiumWeb.SessionSignIn

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
      nil -> start(conn)
      user -> enter(conn, user)
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

  # No per-address limit: one IPv6 network has billions of addresses, so it wouldn't hold.
  # The max_demos cap protects the server, and the worst abuse is a full demo for 24 hours.
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
