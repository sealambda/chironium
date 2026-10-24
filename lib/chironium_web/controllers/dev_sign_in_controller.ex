defmodule ChironiumWeb.DevSignInController do
  @moduledoc """
  Development-only sign-in that skips Google OAuth.

  Creates the user on first use, so contributors can run Chironium without Google
  credentials. The route is mounted only when `:dev_routes` is enabled.
  """

  use ChironiumWeb, :controller

  alias Chironium.Dev.PlaywrightE2EFixtures
  alias ChironiumWeb.SessionSignIn

  @default_email "dev@example.com"

  def create(conn, params) do
    email =
      case params["email"] do
        email when is_binary(email) and email != "" -> email
        _ -> @default_email
      end

    {:ok, conn} = SessionSignIn.sign_in(conn, PlaywrightE2EFixtures.ensure_user!(email))
    redirect(conn, to: ~p"/")
  end
end
