defmodule ChironiumWeb.DevSignInController do
  @moduledoc """
  Development-only sign-in that skips Google OAuth.

  Creates the user on first use, so contributors can run Chironium without Google
  credentials. The route is mounted only when `:dev_routes` is enabled.
  """

  use ChironiumWeb, :controller

  import AshAuthentication.Plug.Helpers, only: [store_in_session: 2]

  alias AshAuthentication.Jwt
  alias Chironium.Dev.PlaywrightE2EFixtures

  @default_email "dev@example.com"

  def create(conn, params) do
    email =
      case params["email"] do
        email when is_binary(email) and email != "" -> email
        _ -> @default_email
      end

    user = PlaywrightE2EFixtures.ensure_user!(email)
    {:ok, token, _claims} = Jwt.token_for_user(user, %{}, [authorize?: false], %{})
    user = struct(user, %{__metadata__: Map.put(user.__metadata__ || %{}, :token, token)})

    conn
    |> store_in_session(user)
    |> redirect(to: ~p"/")
  end
end
