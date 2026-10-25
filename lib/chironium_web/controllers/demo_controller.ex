defmodule ChironiumWeb.DemoController do
  @moduledoc "Starts a public demo: a throwaway user who owns a seeded organization."

  use ChironiumWeb, :controller

  alias Chironium.Demo
  alias ChironiumWeb.SessionSignIn

  # Routes compile before runtime config, so the route always exists.
  plug :require_demo_mode

  def create(conn, _params) do
    user = conn.assigns[:current_user]

    if user && Demo.demo_user?(user) && Ash.exists?(Chironium.Accounts.Organization, actor: user) do
      redirect(conn, to: ~p"/app")
    else
      start(conn)
    end
  end

  # No per-address limit: one IPv6 network has billions of addresses, so it wouldn't hold.
  # The max_demos cap protects the server, and the worst abuse is a full demo for 24 hours.
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
